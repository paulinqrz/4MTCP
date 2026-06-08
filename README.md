# OVERLEAF

https://www.overleaf.com/project/6a26497628d3e2f25adbe085


# TCP Telemetry Stream

Projeto acadêmico de **streaming binário de telemetria via TCP puro**, implementado em Node.js sem HTTP, sem WebSocket e sem frameworks externos.

O objetivo é transmitir um dataset de **4 milhões de registros de sensores industriais** por socket TCP, mantendo estabilidade, baixo consumo de memória, validação de integridade e controle de backpressure.

---

## 1. Problema atendido

**Tema:** Sockets TCP: Transmissão de Streaming Binário

**Problema:** criar um servidor que realize o streaming de um dataset de 4 milhões de registros de telemetria via TCP puro, garantindo que o cliente receba e processe os pacotes sem perda de sincronia.

Este projeto atende esse problema com:

- servidor TCP usando `net.createServer`;
- cliente TCP usando `net.connect`;
- arquivo binário com 4 milhões de registros;
- serialização manual com `Buffer`;
- parser no cliente para processar registros de 20 em 20 bytes;
- validação de sequência dos IDs;
- checksum SHA-256 no destino;
- monitoramento de banda, memória e uso aproximado de CPU;
- mecanismo de backpressure no servidor e no cliente.

---

## 2. Arquitetura

```txt
Gerador de dataset
      ↓
data/telemetry.bin
      ↓
Servidor TCP puro
      ↓
Socket TCP
      ↓
Cliente TCP
      ↓
Parser binário + received.bin + checksum
```

O servidor não carrega o dataset inteiro na memória. Ele lê o arquivo em partes usando `fs.createReadStream` e envia cada bloco pelo socket TCP.

O cliente também não depende de receber registros completos em cada pacote TCP. Como TCP é fluxo contínuo, o cliente mantém um buffer pendente e só processa registros quando possui pelo menos 20 bytes disponíveis.

---

## 3. Formato binário dos registros

Cada registro tem exatamente **20 bytes**.

| Offset | Tamanho | Tipo | Campo |
|---:|---:|---|---|
| 0 | 4 bytes | UInt32 Little Endian | `id` |
| 4 | 8 bytes | BigUInt64 Little Endian | `timestamp` |
| 12 | 4 bytes | Float Little Endian | `temperature` |
| 16 | 4 bytes | Float Little Endian | `pressure` |

Como são **4.000.000 registros**, o arquivo final esperado possui:

```txt
4.000.000 × 20 bytes = 80.000.000 bytes
```

Ou seja, aproximadamente **76,3 MiB**.

---

## 4. Como o backpressure funciona

### No servidor

O servidor lê o arquivo por stream e envia cada chunk pelo socket:

```js
const canContinue = socket.write(chunk);

if (!canContinue) {
  source.pause();
  socket.once('drain', () => source.resume());
}
```

Quando `socket.write()` retorna `false`, significa que o buffer de escrita do socket está cheio. O servidor então pausa a leitura do arquivo para não acumular dados em memória. Quando o socket emite `drain`, o envio é retomado.

### No cliente

O cliente também aplica backpressure ao gravar o arquivo recebido:

```js
const canContinueFileWrite = output.write(chunk);

if (!canContinueFileWrite) {
  socket.pause();
  output.once('drain', () => socket.resume());
}
```

Assim, se o disco ou o processamento do cliente estiverem lentos, o socket é pausado. Isso reduz a leitura do TCP no lado do cliente e, por consequência, o janelamento TCP passa a limitar o envio do servidor.

---

## 5. Sobre SO_RCVBUF e janelamento TCP

O `SO_RCVBUF` é o buffer de recepção do socket mantido pelo sistema operacional. Em Node.js puro, a API `net.Socket` não oferece uma forma portável e direta de configurar `SO_RCVBUF` como em C/C++.

Por isso, este protótipo trabalha em duas camadas:

1. **Camada do sistema operacional:** o TCP controla congestionamento, ACKs e janela de recepção automaticamente.
2. **Camada da aplicação:** o código usa `pause()`, `resume()`, `highWaterMark`, `writableLength` e o evento `drain` para evitar acúmulo de memória no processo Node.js.

Na execução, o servidor também exibe os valores de `readableHighWaterMark` e `writableHighWaterMark` do socket, que representam os limites de buffer da camada de stream da aplicação.

---

## 6. Estrutura do projeto

```txt
tcp-telemetry-stream/
├── data/
│   ├── telemetry.bin
│   └── received.bin
├── src/
│   ├── client.js
│   ├── server.js
│   ├── monitor/
│   │   ├── bandwidth.js
│   │   ├── memory.js
│   │   └── metrics.js
│   ├── protocol/
│   │   ├── checksum.js
│   │   └── serializer.js
│   └── telemetry/
│       └── generator.js
├── tests/
│   ├── backpressure.test.js
│   ├── helpers.js
│   ├── integrity.test.js
│   └── load.test.js
├── package.json
└── README.md
```

---

## 7. Como executar

### 7.1. Instalar dependências

O projeto não usa dependências externas. Mesmo assim, rode:

```bash
npm install
```

---

### 7.2. Gerar o dataset completo

```bash
npm run generate
```

Por padrão, esse comando gera **4.000.000 registros** em:

```txt
data/telemetry.bin
```

Resultado esperado:

```txt
Dataset gerado com sucesso.
Registros: 4000000
Tamanho esperado: 80000000 bytes
SHA-256: ...
```

---

### 7.3. Iniciar o servidor

Em um terminal:

```bash
npm run server
```

O servidor abre a porta TCP `5000` e aguarda conexões.

---

### 7.4. Iniciar o cliente

Em outro terminal:

```bash
npm run client
```

O cliente recebe os bytes, grava o arquivo `data/received.bin`, processa os registros binários e exibe:

- bytes recebidos;
- registros processados;
- sobras no buffer;
- erros de sequência;
- checksum SHA-256 recebido;
- banda média;
- uso de memória;
- eventos de backpressure.

---

## 8. Validação

### 8.1. Teste de integridade

```bash
npm run test:integrity
```

Valida se:

- o arquivo recebido tem o mesmo tamanho do original;
- o SHA-256 do destino é igual ao SHA-256 da origem;
- o cliente processou todos os registros esperados;
- não sobrou nenhum byte quebrado no buffer.

---

### 8.2. Teste de carga

```bash
npm run test:load
```

Executa uma transmissão maior e mostra banda média observada.

---

### 8.3. Teste de backpressure

```bash
npm run test:backpressure
```

Simula um cliente lento usando pausa artificial de processamento e buffer de escrita menor. O teste só passa se observar eventos de backpressure e se a transmissão terminar íntegra.

---

### 8.4. Rodar todos os testes

```bash
npm run test:all
```

---

## 9. Variáveis de ambiente úteis

### Gerador

| Variável | Padrão | Função |
|---|---:|---|
| `RECORDS` | `4000000` | Quantidade de registros gerados |
| `OUTPUT_FILE` | `./data/telemetry.bin` | Caminho do dataset |
| `WRITE_HIGH_WATER_MARK` | `1048576` | Buffer de escrita do arquivo |
| `STATUS_INTERVAL_MS` | `1000` | Intervalo de logs |

Exemplo:

```bash
RECORDS=100000 npm run generate
```

No Windows PowerShell:

```powershell
$env:RECORDS="100000"; npm run generate
```

---

### Servidor

| Variável | Padrão | Função |
|---|---:|---|
| `HOST` | `127.0.0.1` | Host do servidor |
| `PORT` | `5000` | Porta TCP |
| `DATA_FILE` | `./data/telemetry.bin` | Arquivo enviado |
| `READ_HIGH_WATER_MARK` | `65536` | Tamanho dos chunks lidos do arquivo |
| `STATUS_INTERVAL_MS` | `1000` | Intervalo de logs |
| `ONCE` | `0` | Se `1`, encerra após um cliente |

---

### Cliente

| Variável | Padrão | Função |
|---|---:|---|
| `HOST` | `127.0.0.1` | Host do servidor |
| `PORT` | `5000` | Porta TCP |
| `OUTPUT_FILE` | `./data/received.bin` | Arquivo recebido |
| `EXPECT_RECORDS` | vazio | Quantidade esperada de registros |
| `VALIDATE_SEQUENCE` | `1` | Valida IDs sequenciais |
| `WRITE_HIGH_WATER_MARK` | `65536` | Buffer de escrita do arquivo recebido |
| `SLOW_PROCESSING_MS` | `0` | Simula cliente lento |
| `STATUS_INTERVAL_MS` | `1000` | Intervalo de logs |

Exemplo para simular cliente lento:

```bash
SLOW_PROCESSING_MS=10 npm run client
```

No Windows PowerShell:

```powershell
$env:SLOW_PROCESSING_MS="10"; npm run client
```

---

## 10. O que cada arquivo faz

### `src/telemetry/generator.js`

Gera o dataset binário. Cada registro possui ID sequencial, timestamp, temperatura e pressão. O arquivo é escrito por stream, respeitando backpressure do disco.

### `src/protocol/serializer.js`

Define o protocolo binário do projeto. Contém as funções `serialize()` e `deserialize()`, além da constante `RECORD_SIZE = 20`.

### `src/server.js`

Abre um servidor TCP puro. Lê o arquivo binário em chunks e envia pelo socket. Se o buffer do socket encher, pausa a leitura do arquivo e retoma apenas no evento `drain`.

### `src/client.js`

Conecta ao servidor TCP, recebe os bytes, grava o arquivo no destino e processa os registros de 20 bytes. Também valida ordem dos IDs, calcula SHA-256 e monitora banda, memória e CPU aproximada.

### `src/protocol/checksum.js`

Calcula SHA-256 de arquivos por stream, sem carregar o arquivo inteiro na memória.

### `src/monitor/bandwidth.js`

Calcula banda em Mbps.

### `src/monitor/memory.js`

Mede memória RSS do processo em MB.

### `src/monitor/metrics.js`

Centraliza métricas de transmissão: bytes, Mbps atual, Mbps médio, memória, CPU aproximada e eventos de backpressure.

### `tests/integrity.test.js`

Valida transmissão correta, checksum, tamanho final, quantidade de registros e ausência de sobra no buffer.

### `tests/load.test.js`

Executa carga maior para medir banda média e estabilidade.

### `tests/backpressure.test.js`

Simula cliente lento e confirma que o sistema continua íntegro mesmo com backpressure.

---

## 11. Limitações assumidas

- O projeto usa Node.js puro. Por isso, não configura `SO_RCVBUF` diretamente como uma aplicação em C faria.
- O controle de congestionamento TCP real é responsabilidade do sistema operacional.
- O código demonstra o controle de fluxo no nível da aplicação por meio de streams, `pause()`, `resume()` e `drain`.
- O checksum final valida integridade completa do arquivo, mas não implementa ACK por bloco ou retransmissão manual, pois o TCP já oferece entrega confiável e ordenada.

---

## 12. Conclusão técnica

Este protótipo demonstra uma transmissão binária estável via TCP puro. O servidor respeita o limite de escrita do socket, o cliente processa os registros sem perder sincronia, e os testes validam integridade, carga e backpressure.

A solução é adequada para demonstrar conceitos de:

- sockets TCP;
- streaming binário;
- serialização manual;
- buffers;
- backpressure;
- checksum;
- monitoramento de banda;
- processamento incremental de dados.
