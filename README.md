# spotify-lrc

Baixa a letra sincronizada de uma faixa do Spotify como arquivo `.lrc`.

Site: https://biglongs0.github.io/spotify-lrc/

## Como usar

Cole o link da faixa (`open.spotify.com/track/...`) no campo e aperte Enter. Colar o link em qualquer lugar da página também funciona. Sem link, escreva `artista - música`.

A página abre a versão com mais cópias no LRCLIB. Se ela não for a certa, o botão de versões lista as outras gravações encontradas, separadas por artista e duração. Daí é copiar ou baixar.

Para abrir uma faixa direto, passe o ID do Spotify em `?track=`:

```
https://biglongs0.github.io/spotify-lrc/?track=0VjIjW4GlUZAMYd2vXMi3b
```

## De onde vem a letra

Do Spotify a página só pega o título e a capa, pelo oEmbed, que é a única rota dele que o navegador consegue ler de outro site. A letra vem do [LRCLIB](https://lrclib.net), um banco aberto de letras sincronizadas mantido pelos usuários.

O oEmbed não informa o artista. Em música com muito cover, a escolha automática pode cair na versão errada, e aí vale abrir a lista de versões.

Quando o LRCLIB só tem a letra sem tempo, sai um `.txt`.

## O arquivo

```
[ti:Título]
[ar:Artista]
[al:Álbum]
[length:03:22]
[re:spotify-lrc]

[00:13.42] primeira linha
```

A linha `[al:]` só entra quando duas cópias concordam no nome do álbum. Muitas entradas do LRCLIB trazem o nome de uma coletânea ou de uma playlist ali.

## Rodar local

Não tem build. Os módulos JavaScript não carregam por `file://`, então sirva a pasta:

```
python -m http.server 8000
```

e abra http://localhost:8000.

## Privacidade

O navegador fala direto com `open.spotify.com` e `lrclib.net`. Os recentes ficam no `localStorage` do seu navegador e não vão para lugar nenhum.

O projeto não tem vínculo com o Spotify nem com o LRCLIB. O visual é o do [lph](https://lph.biglongs.cc/).

## Licença

MIT. A fonte Inter usa a SIL Open Font License, que está em `assets/fonts/LICENSE-Inter.txt`.
