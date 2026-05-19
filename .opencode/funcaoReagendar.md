## Funçao para reagendamento de clientes por parte do ADMIN. #

Objetivo: Funçao que habilita através de um botão no card do agendamento, abaixo do calendário de agendamentos, a opçao de reagendar um cliente, trocando o mesmo para outra data e/ou horário disponível na agenda.

## FUNCIONAMENTO ##

1. Admin loga em sua conta
2. Navega até a data que o cliente está agendado
3. Clica no botão ˜reagendar" (que deverá ser criado) 
4. Abre um modal de reagendamento, seguindo o mesmo fluxo de agendamento comum que temos na seccáo de agendamento (pode reaproveitar o código e o fluxo igualmente).
5. Confirma o reagendamento
6. O sistema solicita o envio de mensagem padrão e personalizada informando o cliente que seu horário foi reagendado.
7. O sistema adiciona este novo horário no banco de dados de agendamentos.
8. O sistema apaga o horário antigo que estava registrado no banco de dados antes do reagendamento.

## REGRAS ##

1. Reaproveitar o máximo de estilos CSS e desenvolvimento HTML que já temos trabalhando com padronização de códigos.
2. Reaproveitar ao máximo os códigos JS que servem para Agendamento, pois seguirá o mesmo fluxo.
3. Ao clicar em reagendar o sistema deverá salvar os dados NOME e TELEFONE que constão no banco de dados do agendamento atual para reaproveitar no momento final que solicita estes dados novamente, assim já vindo preenchidos para evitar que o ADMIN tenha que preencher novamente. 
4. O sistema deve obrigatoriamente, após finalizar o reagendamento, remover o horário que estava agendado antes do ragendamento evitando agendamentos em duplicidade.
5. Trabalhar com a mesma lógica de banco de dados, utilizando os mesmos IDs e demais ítens que se façam necessários.

## TESTES ##
1. Após concluído sugerir testes de funcionamento.
2. após testes aprovados, fazer commit.
