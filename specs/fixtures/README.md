# Fixtures

Documentos de teste versionados, consumidos por `10-testes.md`. Este arquivo é o **dono único** do inventário de fixtures — qual arquivo existe, o que contém, como é gerado. `10-testes.md` é dono da estratégia de teste (property tests, tolerância, distribuição da pirâmide), não do inventário; ele referencia este arquivo em vez de repetir a lista.

## Inventário

| Arquivo | Estado | Conteúdo | Como criar |
|---|---|---|---|
| `empty.planta.json` | Pronto | Documento vazio válido | — |
| `single-room.planta.json` | Pronto | Retângulo 3200 × 2500, área exata 8.000.000 mm² | — |
| `apto-44m2.planta.json` | A criar | Apartamento de referência completo, 7 cômodos | Desenhar no app com as medidas cotadas da tabela abaixo. Serve simultaneamente de fixture e de validação do fluxo do M1 |
| `shared-nodes.planta.json` | A criar | Dois cômodos com aresta compartilhada | Dois retângulos desenhados com snap ao nó, compartilhando uma aresta |
| `concave.planta.json` | A criar | Cômodo em L, para centroide e ponto-em-polígono | Um cômodo em L |
| `furnished.planta.json` | A criar | `apto-44m2` com 40 móveis, para teste de performance | `apto-44m2` mais 40 móveis do catálogo |
| `invalid-orphan-node.planta.json` | A criar | Referência a nó inexistente, para teste de erro | Copiar `single-room` e trocar um id em `loop` por `"n99"` |
| `legacy/v0.planta.json` | A criar | Formato antigo, para teste de migração | Só existe quando houver uma v0 real |

As fixtures marcadas "A criar" devem ser **autoradas no próprio app** durante o M1, não escritas à mão. Escrever coordenadas manualmente introduz erro e faz a fixture deixar de refletir o que o app produz.

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
