# Respostas – Catálogo de Livros com GraphQL

## Parte 1: Perguntas de reflexão

**1. Por que `status` é melhor como enum do que como String?**
Com enum, só dá para mandar os três valores certos (WANT_TO_READ, READING e FINISHED). Se alguém mandar "lido" ou digitar errado, o próprio GraphQL já recusa. Com String, qualquer texto passaria e eu teria que validar na mão.

**2. Por que `rating` é opcional e `title` não?**
Todo livro tem título, não faz sentido cadastrar um livro sem nome. Já a nota só existe depois que você termina de ler. Então um livro que ainda está em "Quero ler" ou "Lendo" fica sem nota (null).

**3. `bookCount` deve ser armazenado ou calculado por um resolver? Justifique.**
Calculado. Se eu guardasse esse número, teria que lembrar de atualizar toda vez que adicionasse ou apagasse um livro, e uma hora ia ficar errado. Contando na hora pelo resolver, o valor sempre bate com a lista de livros.

## Parte 4: Análise

**9. Quantas requisições em REST? Quantas com GraphQL?**
Em REST seriam pelo menos 3: uma para os livros, uma para os autores e uma para as estatísticas. Com GraphQL eu fiz só 1 ao abrir a tela, porque a mesma query já pede livros, autores e stats juntos. Depois disso, cada filtro ou alteração faz mais uma requisição só, que recarrega os livros e as estatísticas.

**10. O que acontece quando uma mutation lança um erro? Qual o código HTTP e como o front descobre?**
A resposta volta com status 200 mesmo assim, o que no começo parece estranho. O erro vem dentro do JSON, num campo `errors` com a mensagem, e o `data` vem null. Por isso a função `gql()` do front não olha só se o HTTP deu certo: ela confere se veio `errors` e, se vier, mostra a mensagem na tela.

**11. O problema N+1 com `Author.books` e como um DataLoader ajudaria.**
Se eu listar 100 autores, faço 1 consulta para pegar os autores e depois mais 1 consulta de livros para cada autor, ou seja, 101 consultas. Esse é o N+1. O DataLoader junta todos esses pedidos e faz uma consulta só, buscando os livros de todos os autores de uma vez. Aí cai para 2 consultas no total.

**12. Uma vantagem e uma desvantagem de um único endpoint (`/graphql`).**
Vantagem: o front pede exatamente o que precisa em uma chamada só, sem ficar chamando várias rotas diferentes.
Desvantagem: como tudo vai para a mesma URL via POST, fica mais difícil usar cache e ver nos logs o que cada requisição estava fazendo, porque não dá para separar por rota.
