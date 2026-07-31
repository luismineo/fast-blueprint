# 06 — Catálogo de mobília

## Objetivo

O usuário não deve precisar saber que uma cama queen tem 1,58 × 1,98 m. O catálogo carrega esse conhecimento, com medidas de mercado brasileiro.

O catálogo é um ponto de partida, nunca uma restrição. Toda dimensão é editável após inserir, e criar um item do zero custa dois cliques.

## Estrutura

Arquivo JSON em `packages/catalog/data/default.json`, validado pelo mesmo mecanismo Zod do documento.

```jsonc
{
  "version": 1,
  "items": [
    {
      "id": "bed-queen",
      "name": "Cama queen",
      "category": "quarto",
      "width": 1580,
      "depth": 1980,
      "height": 550,
      "clearance": 600,
      "tags": ["cama", "casal", "dormir"]
    }
  ]
}
```

| Campo | Obrigatório | Nota |
|---|---|---|
| `id` | sim | Estável. Nunca reutilizar após remoção |
| `name` | sim | pt-BR, sentence case |
| `category` | sim | Uma das categorias abaixo |
| `width` | sim | mm, eixo local X (frente do móvel) |
| `depth` | sim | mm, eixo local Y (fundo encosta na parede) |
| `height` | não | mm. Não usado no render 2D; existe para futuro e para referência |
| `clearance` | não | mm de circulação sugerida. Default 0 |
| `tags` | não | Termos de busca adicionais |

## Convenção de orientação

`width` é a dimensão paralela à parede em que o móvel encosta. `depth` é perpendicular, apontando para dentro do cômodo.

Consequência: uma cama tem `width` 1580 (cabeceira) e `depth` 1980 (comprimento), porque a cabeceira é o que encosta na parede. Um sofá tem `width` 1800 e `depth` 900.

Essa convenção é o que faz o snap a parede (`02-unidades-e-geometria.md`) funcionar sem o usuário pensar.

## Categorias

`quarto`, `sala`, `cozinha`, `banheiro`, `servico`, `escritorio`, `circulacao`

Determinam agrupamento no painel e nada mais.

## Catálogo default

Medidas típicas do mercado brasileiro. Valores são o ponto de partida mais comum, não o único.

### Quarto

| id | Nome | L × P (mm) | Circulação |
|---|---|---|---|
| `bed-single` | Cama solteiro | 880 × 1880 | 600 |
| `bed-single-xl` | Cama solteiro king | 960 × 2030 | 600 |
| `bed-double` | Cama casal | 1380 × 1880 | 600 |
| `bed-queen` | Cama queen | 1580 × 1980 | 600 |
| `bed-king` | Cama king | 1930 × 2030 | 600 |
| `bed-bunk` | Beliche | 980 × 1980 | 600 |
| `nightstand` | Criado-mudo | 500 × 400 | 0 |
| `wardrobe-2d` | Guarda-roupa 2 portas | 900 × 550 | 700 |
| `wardrobe-4d` | Guarda-roupa 4 portas | 1800 × 550 | 700 |
| `wardrobe-6d` | Guarda-roupa 6 portas | 2700 × 600 | 700 |
| `dresser` | Cômoda | 900 × 450 | 700 |

### Sala

| id | Nome | L × P (mm) | Circulação |
|---|---|---|---|
| `sofa-2` | Sofá 2 lugares | 1600 × 900 | 400 |
| `sofa-3` | Sofá 3 lugares | 2000 × 900 | 400 |
| `sofa-retratil-3` | Sofá retrátil 3 lugares | 2100 × 1000 | 400 |
| `sofa-l` | Sofá de canto | 2400 × 1700 | 400 |
| `armchair` | Poltrona | 800 × 800 | 300 |
| `coffee-table` | Mesa de centro | 1000 × 600 | 400 |
| `side-table` | Mesa lateral | 450 × 450 | 0 |
| `tv-rack-15` | Rack 1,50 m | 1500 × 400 | 0 |
| `tv-rack-18` | Rack 1,80 m | 1800 × 450 | 0 |
| `bookshelf` | Estante | 800 × 350 | 600 |
| `dining-4` | Mesa de jantar 4 lugares | 1200 × 800 | 750 |
| `dining-6` | Mesa de jantar 6 lugares | 1600 × 900 | 750 |
| `dining-round-4` | Mesa redonda 4 lugares | 1100 × 1100 | 750 |
| `chair` | Cadeira | 450 × 500 | 0 |
| `bench-corner` | Canto alemão | 1600 × 1600 | 600 |

### Cozinha

| id | Nome | L × P (mm) | Circulação |
|---|---|---|---|
| `counter-run` | Bancada (por metro) | 1000 × 600 | 900 |
| `sink-cabinet` | Gabinete de pia | 1200 × 550 | 900 |
| `stove-4` | Fogão 4 bocas | 520 × 600 | 900 |
| `stove-5` | Fogão 5 bocas | 760 × 600 | 900 |
| `cooktop-4` | Cooktop 4 bocas | 580 × 500 | 900 |
| `fridge-frost-free` | Geladeira frost free | 700 × 700 | 900 |
| `fridge-duplex` | Geladeira duplex | 830 × 750 | 900 |
| `microwave` | Micro-ondas | 500 × 400 | 0 |
| `dishwasher` | Lava-louças | 600 × 600 | 900 |
| `island-small` | Ilha compacta | 1200 × 700 | 900 |

### Banheiro

| id | Nome | L × P (mm) | Circulação |
|---|---|---|---|
| `toilet` | Vaso sanitário | 380 × 700 | 500 |
| `sink-pedestal` | Lavatório com coluna | 550 × 450 | 600 |
| `vanity-60` | Gabinete 60 cm | 600 × 450 | 600 |
| `vanity-80` | Gabinete 80 cm | 800 × 480 | 600 |
| `shower-90` | Box 90 × 90 | 900 × 900 | 0 |
| `shower-120` | Box 120 × 90 | 1200 × 900 | 0 |
| `bathtub` | Banheira | 1700 × 750 | 0 |

### Área de serviço

| id | Nome | L × P (mm) | Circulação |
|---|---|---|---|
| `washer` | Máquina de lavar | 600 × 650 | 900 |
| `washer-dryer` | Lava e seca | 600 × 700 | 900 |
| `laundry-sink` | Tanque | 550 × 550 | 700 |
| `laundry-cabinet` | Armário de serviço | 800 × 400 | 700 |

### Escritório

| id | Nome | L × P (mm) | Circulação |
|---|---|---|---|
| `desk-120` | Escrivaninha 1,20 m | 1200 × 600 | 800 |
| `desk-140` | Escrivaninha 1,40 m | 1400 × 700 | 800 |
| `desk-l` | Mesa em L | 1600 × 1400 | 800 |
| `office-chair` | Cadeira de escritório | 650 × 650 | 0 |
| `filing-cabinet` | Gaveteiro | 400 × 500 | 600 |

### Circulação

Itens sem massa física, usados para verificar espaço livre.

| id | Nome | L × P (mm) |
|---|---|---|
| `clearance-person` | Passagem de pessoa | 600 × 600 |
| `clearance-wheelchair` | Giro de cadeira de rodas | 1500 × 1500 |
| `clearance-door-swing` | Abertura de porta 80 | 800 × 800 |

Renderizados apenas como contorno tracejado, sem preenchimento.

`clearance-wheelchair` usa o círculo de giro de 1,50 m da NBR 9050. Colocar esse item numa planta responde de imediato se o apartamento é acessível.

## Catálogo do usuário

Itens criados pelo usuário vão para `planta:catalog:user` no IndexedDB, mesma estrutura, campo `source: 'user'`.

Criados por: "Salvar como item" no painel de propriedades de um móvel selecionado, que pergunta nome e categoria.

Exportáveis e importáveis como JSON, para compartilhar entre máquinas.

Item de usuário com `id` colidindo com o default vence na resolução — permite sobrescrever uma medida do catálogo padrão que não bate com o móvel real.

## Busca

Campo único no topo do painel. Casa contra `name`, `tags` e `category`, sem acento e sem caixa. Ordena por: casamento no início do nome, casamento em qualquer posição do nome, casamento em tag.

Buscar "cama" retorna as seis camas. Buscar "160" não faz nada — busca é textual, não dimensional.

## Painel

Agrupado por categoria, categorias recolhíveis, últimos 8 itens usados numa seção "Recentes" no topo.

Cada item mostra nome, dimensão em cm e uma miniatura de proporção correta (retângulo puro, gerado, não asset).

Miniaturas geradas em vez de desenhadas à mão: mantém o catálogo puramente em dados e evita 60 arquivos SVG que precisariam ser mantidos em sincronia com as medidas.

## Critérios de aceitação

- [ ] Catálogo default carrega e valida contra o schema Zod
- [ ] Nenhum `id` duplicado no catálogo default
- [ ] Todo item tem `width > 0` e `depth > 0`
- [ ] Item de catálogo inserido no canvas produz `FurnitureItem` com `catalogId` preenchido
- [ ] Editar a dimensão do móvel inserido não altera o catálogo
- [ ] Item de usuário com id colidindo sobrescreve o default
- [ ] Busca por "geladeira" retorna os dois itens de geladeira
- [ ] Busca ignora acentos: "servico" e "serviço" dão o mesmo resultado
- [ ] Itens de categoria `circulacao` renderizam só com contorno tracejado
