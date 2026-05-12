Fluxo de trabalho do sistema de agendamento.

App será dividido em 2 roles

----------------------
A. Role Cliente (index.html)

A1. Cliente acessa o app através de um link que foi compartilhado pela manicure.
A2. Ao acessar o link o cliente se depara com uma tela de boas vindas com principais informacões do salão.
A3. A tela de boas vindas terá logotipo do salão, dados de contato, área para avisos (variavel conforme gravado pelo ADMIN em sua role)
A4. Nesta tela também temos um botão para agendamentos, quando clicado direciona para o início do fluxo de agendamento.
A5. O fluxo de agendamento se dá da seguinte forma:
    A5.1 - Cliente escolhe na lista de procedimentos (criado na role admin) qual atendimento deseja.
    A5.2 - Cliente escolhe a data do agendamento
    A5.3 - Cliente escolhe o horário de agendamento
    A5.4 - Preenche seus dados (Nome e Telefone)
    A5.5 - É direcionado para a tela de confirmação
    A5.6 - O App envia uma mensagem com autorizaçao do cliente através do Whatsapp com a mensagem de confirmação de agendamento.
    A5.7 - Agendamento Feito! Tanto o cliente como o admnistrador tem uma msg salva nos seus respectivos Whatsapps. 

----------------------
B. Role Administrador (admin.html)

B1. Administrador loga no seu role com usuário e senha (cadastrados através do banco de Dados Firebase)
B2. Tela inicial para o admim será uma agenda com calendário na parte superior e lista dos agendamentos do dia na parte inferior que são ativados conforme for clicando nas datas desejadas.