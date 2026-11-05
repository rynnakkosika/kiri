# Google Play listing for Travbana

Everything here is ready to paste into the Play Console when the developer account exists.
Images are in `store/graphics/` and `store/screenshots/`.

## App details

| Field | Value |
|---|---|
| App name (max 30) | Travbana: Harness Racing |
| Package name | io.github.rynnakkosika.travbana |
| App or game | Game |
| Category | Racing (alternative: Strategy) |
| Free or paid | Free |
| Ads | No ads |
| In-app purchases | None |
| Privacy policy URL | https://rynnakkosika.github.io/kiri/privacy.html |
| Website | https://rynnakkosika.github.io/kiri/ |
| Contact email | Your own email (required by Play, shown publicly) |

## English (en-US)

**Short description** (max 80 characters, this one is 80):

> Turn-based tactical harness racing. Sit in cover, then time your drive for home.

**Full description** (max 4000 characters):

> Travbana is a turn-based tactical harness racing game. You drive two trotters from your own stable in a full field of 12 horses on a 1000 m oval. Post positions are drawn before every race.
>
> Every turn each horse gets a speed from 1 to 9 and a lane move, and then all horses move at once. Winning isn't about the fastest horse. It's about the smartest trip.
>
> HOW THE RACE WORKS
> • In cover: right behind another horse, yours saves energy.
> • Death seat: racing outside the leader with nobody ahead of you burns energy fast.
> • Wide in the curves: the outer lanes are longer in the turns.
> • Boxed in: you can't pull out while a horse is right alongside you.
> • Galloping: push your horse too hard and it breaks into a gallop and loses speed.
>
> GAME MODES
> • Quick race: a classic 2100 m race, 12 horses, against five AI stables.
> • Custom race: choose the distance, the number of rivals, the difficulty and your horse types.
> • Series: three races, with prize money added up across them.
> • Play with a friend: race a friend online with a 6-character game code.
>
> FEATURES
> • Four AI driving styles: Steady, Pocket sitter, Front runner and Tactician.
> • Three difficulty levels. Difficulty only changes how the AI drives, never the rules.
> • You always see the predicted energy cost of your move before you commit.
> • A race log explains everything that happened each turn.
> • The game saves after every turn, so you can continue later.
> • Plays offline (except for playing with a friend).
> • No ads, no accounts, no tracking.

## Suomi (fi-FI)

The game itself is in English, so a Finnish listing is optional. If you add it, mention that the game is in English.

**Lyhyt kuvaus** (max 80 merkkiä, tämä on 76):

> Vuoropohjainen taktinen ravipeli. Aja suojassa ja ajoita loppukirisi oikein.

**Täysi kuvaus:**

> Travbana on vuoropohjainen taktinen ravipeli. Ajat kahta ravuria omasta tallistasi täydessä 12 hevosen lähdössä 1000 metrin soikealla radalla. Lähtöradat arvotaan ennen jokaista kisaa.
>
> Joka vuorolla jokainen hevonen saa vauhdin 1–9 ja ratasiirron, ja sitten kaikki hevoset liikkuvat yhtä aikaa. Voittoon ei riitä nopein hevonen, vaan tarvitaan fiksuin ajotapa.
>
> NÄIN KILPAILU TOIMII
> • Suojassa: toisen hevosen takana omasi säästää voimia.
> • Kuolemanpaikka: johtajan rinnalla ulkoradalla, kun edessä ei ole ketään, voimat palavat nopeasti.
> • Leveällä kaarteessa: ulkoradat ovat kaarteissa pidempiä.
> • Lukossa: et pääse ulos, jos vieressäsi on hevonen.
> • Laukka: jos ajat hevosta liian kovaa, se laukkaa ja menettää vauhtia.
>
> PELIMUODOT
> • Pikakisa: klassinen 2100 metrin kisa, 12 hevosta, viittä tekoälytallia vastaan.
> • Oma kisa: valitse matka, vastustajien määrä, vaikeustaso ja hevostyypit.
> • Sarja: kolme kisaa, ja palkintorahat lasketaan yhteen.
> • Pelaa kaverin kanssa: kisaa kaveria vastaan verkossa 6-merkkisellä pelikoodilla.
>
> Ei mainoksia, ei tilejä, ei seurantaa. Peli on englanninkielinen.

## Data safety form (answers)

- Does the app collect or share any of the required user data types? **No.**
  - Saves stay on the device. Online play sends data straight between the two players' devices; the PeerJS matchmaking service only sees the network address needed to connect, and Travbana doesn't collect it.
- Is all user data encrypted in transit? **Yes** (WebRTC and HTTPS).
- Can users request that data be deleted? **No data is collected.** (Uninstalling deletes the local saves.)

## Content rating questionnaire (IARC)

- Category: Game.
- Violence, fear, sexuality, language, drugs: **None.**
- Gambling: **No.** Prize money in the game is only a score; there's no betting and no real money.
- Users can interact or share content: **Yes, limited.** Two players can race online with a code; the only typed text is a stable name. There's no chat.
- Shares location: **No.** Digital purchases: **No.**
- Expected rating: PEGI 3 / Everyone.

## Target audience

Choose **13 and over** (or 18+). Choosing an age group under 13 brings in the Families policy and extra requirements.

## Before you upload (when you have the developer account)

1. Create the app in the Play Console with the details above.
2. Upload `mobile/android/app/build/outputs/bundle/release/app-release.aab` to **Internal testing** first.
3. A new personal developer account must run a **closed test with at least 12 testers for 14 days** before it can publish to production.
4. Turn on **Play App Signing** (the default). Your upload key is the one in `mobile/keys/`.
