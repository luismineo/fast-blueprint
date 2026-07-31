# Fixtures

Documentos de teste versionados, consumidos por `10-testes.md`.

## Existentes

| Arquivo | Estado |
|---|---|
| `empty.planta.json` | Pronto |
| `single-room.planta.json` | Pronto. Retângulo 3200 × 2500, área exata 8.000.000 mm² |

## A criar

Estes devem ser **autorados no próprio app** durante o M1, não escritos à mão. Escrever coordenadas manualmente introduz erro e faz a fixture deixar de refletir o que o app produz.

| Arquivo | Como criar |
|---|---|
| `apto-44m2.planta.json` | Desenhar o apartamento de referência no app, com as medidas cotadas da tabela abaixo. Serve simultaneamente de fixture e de validação do fluxo do M1 |
| `shared-nodes.planta.json` | Dois retângulos desenhados com snap ao nó, compartilhando uma aresta |
| `concave.planta.json` | Um cômodo em L |
| `furnished.planta.json` | `apto-44m2` mais 40 móveis do catálogo |
| `invalid-orphan-node.planta.json` | Copiar `single-room` e trocar um id em `loop` por `"n99"` |
| `legacy/v0.planta.json` | Só existe quando houver uma v0 real |

## Apartamento de referência

Medidas tiradas com trena, face interna a face interna. Envelope externo 5900 × 7900 mm.

| Cômodo | Medida cotada (mm) | Área na planta legal |
|---|---|---|
| Estar/jantar (mais hall) | 2400 × 4900 | 12,25 m² |
| Cozinha / área de serviço | 3400 × 1800, avançando 1000 atrás da parede do Dormitório 01 | 6,75 m² |
| Dormitório 01 | 3200 × 2500 | 8,30 m² |
| Dormitório 02 | 3200 × 2300 | 7,04 m² |
| Banheiro | 2200 × 1200 | 2,55 m² |
| Circulação | — | 0,99 m² |
| Sacada | 2400 × 900 | 2,25 m² |

Disposição: a cozinha fica junto à entrada, integrada à sala sem parede. O Dormitório 01 fica ao lado da cozinha, com janela na fachada lateral. O Dormitório 02 fica do lado da sacada. O banheiro fica entre os dois dormitórios. A entrada é na parede lateral da sala, logo abaixo da cozinha. A sacada fica na ponta oposta, ligada à sala por porta de correr.

As áreas da planta legal consideram espessura de parede; o Planta não. A divergência é esperada — ver ADR-0002 e a tolerância de teste em `10-testes.md`.
