# spotify-lrc

Downloads the synced lyrics of a Spotify track as an `.lrc` file.

Site: https://biglongs0.github.io/spotify-lrc/

## Usage

Paste a track link (`open.spotify.com/track/...`) into the field and press Enter. Pasting the link anywhere on the page works too. Without a link, type `artist - song`.

The page opens the version with the most copies on LRCLIB. If that is the wrong one, the versions button lists the other recordings it found, grouped by artist. Then copy or download.

To open a track directly, pass its Spotify ID in `?track=`:

```
https://biglongs0.github.io/spotify-lrc/?track=0VjIjW4GlUZAMYd2vXMi3b
```

## Where the lyrics come from

From Spotify the page only reads the title and the cover, through oEmbed, which is the only Spotify endpoint a browser can read from another site. The lyrics come from [LRCLIB](https://lrclib.net), an open database of synced lyrics kept by its users.

oEmbed does not return the artist. For a song with many covers, the automatic pick can land on the wrong version, and the versions list is there for that.

LRCLIB often holds the same recording many times with different durations filled in. Copies by the same artist count as one version when their lyrics match or their length is within 2 seconds.

When LRCLIB only has unsynced lyrics, you get a `.txt` instead.

## The file

```
[ti:Title]
[ar:Artist]
[al:Album]
[length:03:22]
[re:spotify-lrc]

[00:13.42] first line
```

The `[al:]` line is only written when two copies agree on the album name. Many LRCLIB entries put a compilation or playlist name there.

## Running locally

There is no build step. JavaScript modules do not load from `file://`, so serve the folder:

```
python -m http.server 8000
```

and open http://localhost:8000.

## Privacy

The browser talks straight to `open.spotify.com` and `lrclib.net`. Recent tracks stay in your browser's `localStorage` and are not sent anywhere.

The project is not affiliated with Spotify or LRCLIB. The look comes from [lph](https://lph.biglongs.cc/).

## License

MIT. The Inter font uses the SIL Open Font License, included in `assets/fonts/LICENSE-Inter.txt`.
