# Respostas – Catálogo de Livros com GraphQL

## Parte 1: Perguntas de reflexão

**1. Por que `status` é melhor como enum do que como String?**  
**R.:** $\color{red}{\text{Com enum, só dá para mandar os três}}$ $\color{red}{\text{valores certos do enum (quero ler, lendo e}}$ $\color{red}{\text{lido). Se alguém mandar "terminado" ou digitar errado,}}$ $\color{red}{\text{o próprio GraphQL já recusa. Com String, qualquer}}$ $\color{red}{\text{texto passaria e eu teria que validar na}}$ $\color{red}{\text{mão.}}$

**2. Por que `rating` é opcional e `title` não?**  
**R.:** $\color{red}{\text{Todo livro tem título, não faz sentido cadastrar}}$ $\color{red}{\text{um livro sem nome. Já a nota só}}$ $\color{red}{\text{existe depois que você termina de ler. Então}}$ $\color{red}{\text{um livro que ainda está em "Quero ler"}}$ $\color{red}{\text{ou "Lendo" fica sem nota (null).}}$

**3. `bookCount` deve ser armazenado ou calculado por um resolver? Justifique.**  
**R.:** $\color{red}{\text{Calculado. Se eu guardasse esse número, teria que}}$ $\color{red}{\text{lembrar de atualizar toda vez que adicionasse ou}}$ $\color{red}{\text{apagasse um livro, e uma hora ia ficar}}$ $\color{red}{\text{errado. Contando na hora pelo resolver, o valor}}$ $\color{red}{\text{sempre bate com a lista de livros.}}$

## Parte 4: Análise

**9. Quantas requisições em REST? Quantas com GraphQL?**  
**R.:** $\color{red}{\text{Em REST seriam pelo menos 3: uma para}}$ $\color{red}{\text{os livros, uma para os autores e uma}}$ $\color{red}{\text{para as estatísticas. Com GraphQL eu fiz só}}$ $\color{red}{\text{1 ao abrir a tela, porque a mesma}}$ $\color{red}{\text{query já pede livros, autores e stats juntos.}}$ $\color{red}{\text{Depois disso, cada filtro ou alteração faz mais}}$ $\color{red}{\text{uma requisição só, que recarrega os livros e}}$ $\color{red}{\text{as estatísticas.}}$

**10. O que acontece quando uma mutation lança um erro? Qual o código HTTP e como o front descobre?**  
**R.:** $\color{red}{\text{A resposta volta com status 200 mesmo assim,}}$ $\color{red}{\text{o que no começo parece estranho. O erro}}$ $\color{red}{\text{vem dentro do JSON, num campo errors com}}$ $\color{red}{\text{a mensagem, e o data vem null. Por}}$ $\color{red}{\text{isso a função gql() do front não olha}}$ $\color{red}{\text{só se o HTTP deu certo: ela confere}}$ $\color{red}{\text{se veio errors e, se vier, mostra a}}$ $\color{red}{\text{mensagem na tela.}}$

**11. O problema N+1 com `Author.books` e como um DataLoader ajudaria.**  
**R.:** $\color{red}{\text{Se eu listar 100 autores, faço 1 consulta}}$ $\color{red}{\text{para pegar os autores e depois mais 1}}$ $\color{red}{\text{consulta de livros para cada autor, ou seja,}}$ $\color{red}{\text{101 consultas. Esse é o N+1. O DataLoader}}$ $\color{red}{\text{junta todos esses pedidos e faz uma consulta}}$ $\color{red}{\text{só, buscando os livros de todos os autores}}$ $\color{red}{\text{de uma vez. Aí cai para 2 consultas}}$ $\color{red}{\text{no total.}}$

**12. Uma vantagem e uma desvantagem de um único endpoint (`/graphql`).**  
**R.:** $\color{red}{\text{Vantagem: o front pede exatamente o que precisa}}$ $\color{red}{\text{em uma chamada só, sem ficar chamando várias}}$ $\color{red}{\text{rotas diferentes.}}$  
$\color{red}{\text{Desvantagem: como tudo vai para a mesma URL}}$ $\color{red}{\text{via POST, fica mais difícil usar cache e}}$ $\color{red}{\text{ver nos logs o que cada requisição estava}}$ $\color{red}{\text{fazendo, porque não dá para separar por rota.}}$
