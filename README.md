# spotify-lrc

Downloads the synced lyrics of a Spotify track as an `.lrc` file.

Site: https://biglongs0.github.io/spotify-lrc/

## Usage

Paste a track link (`open.spotify.com/track/...`) into the field and press Enter. Pasting the link anywhere on the page works too. Without a link, type `artist - song`.

The page works out which recording the link is and opens that version. When it cannot, it falls back to the version with the most copies on LRCLIB. Either way the versions button lists the other recordings it found, grouped by artist. Then copy or download.

To open a track directly, pass its Spotify ID in `?track=`:

```
https://biglongs0.github.io/spotify-lrc/?track=0VjIjW4GlUZAMYd2vXMi3b
```

## Where the lyrics come from

From Spotify the page only reads the title and the cover, through oEmbed, which is the only Spotify endpoint a browser can read from another site. The lyrics come from [LRCLIB](https://lrclib.net), an open database of synced lyrics kept by its users.

LRCLIB often holds the same recording many times with different durations filled in. Copies by the same artist count as one version when their lyrics match or their length is within 2 seconds.

## How the right version gets picked

oEmbed returns no artist and no length. Without those, a song cannot be told apart from its own covers, and the pick used to fall to whichever version LRCLIB happened to hold the most copies of.

The cover closes that gap, because it is the exact album art of the track that was pasted. The page reduces it to a 9x8 greyscale image and keeps a 64-bit dHash of it, which survives the rescaling and recompression that separate one CDN's copy of an image from another's. It then hashes the covers of the candidates the [iTunes Search API](https://performance-partners.apple.com/search-api) returns for the same title. The candidate whose art matches names the artist, the album and the length of that recording, and those go into the LRCLIB ranking: the right artist outweighs a title match, and a length within 3 seconds outweighs the copy count.

The match has to be unambiguous to count. The best candidate must be within a Hamming distance of 12, and it must beat the nearest candidate by a *different* artist by at least 6. Two editions by the same artist are not a conflict, so they do not block a match. Measured against Apple's art for the same album, the right cover came in at a distance of 0 to 1 while the next album sat above 20, which is where those numbers come from.

Nothing depends on the match succeeding. Different territorial art, a release Apple does not carry, a cover the hash cannot read, a rate-limited search — each ends with no answer rather than a wrong one, and the ranking falls back to the copy count.

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

The browser talks straight to `open.spotify.com`, `itunes.apple.com` and `lrclib.net`, and loads cover images from Spotify's and Apple's CDNs. Nothing else is contacted, and the page's `Content-Security-Policy` is the list of what it may reach. Recent tracks stay in your browser's `localStorage` and are not sent anywhere.

The project is not affiliated with Spotify, LRCLIB or Apple. The look comes from [lph](https://lph.biglongs.cc/).

## License

MIT. The Inter font uses the SIL Open Font License, included in `assets/fonts/LICENSE-Inter.txt`.
