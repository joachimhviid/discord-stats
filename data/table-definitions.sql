create table channel_recipients
(
    id         serial
        constraint channel_recipients_pk
            primary key,
    channel_id bigint not null
        constraint channel_recipients_channels_id_fk
            references channels,
    user_id    bigint not null
        constraint channel_recipients_users_id_fk
            references users,
    constraint channel_recipients_pk2
        unique (channel_id, user_id)
);

create table channel_types
(
    id   serial
        constraint channel_types_pk
            primary key,
    name varchar(20) not null
);

create table channels
 (
     id        bigint  not null
         constraint channels_pk
             primary key,
     type      integer not null
         constraint channels_channel_types_id_fk
             references channel_types,
     server_id bigint
         constraint channels_servers_id_fk
             references servers
 );

 create table messages
 (
     id         bigint    not null
         constraint messages_pk
             primary key,
     timestamp  timestamp not null,
     content    text,
     attachment text,
     channel_id bigint    not null
         constraint messages_channels_id_fk
             references channels
 );

create table servers
(
    id   bigint      not null
        constraint servers_pk
            primary key,
    name varchar(50) not null
);

create table users
(
    id            bigint      not null
        constraint users_pk
            primary key,
    username      varchar(40) not null,
    discriminator char(4)     not null
);
