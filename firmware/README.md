# Firmware z paskiem

Na fabrycznym firmware NuPhy pasek dookoła obudowy da się zmieniać tylko skrótami Fn + M. Ten firmware to kod NuPhy w wersji z SignalRGB (od [SRGBmods](https://github.com/SRGBmods/NuphyQMK)) plus moja łatka [`keyglow-side.patch`](keyglow-side.patch). Po wgraniu KeyGlow sam to wykrywa i pasek ustawiasz w apce: tryb, kolor, jasność i prędkość. Apka pokazuje wtedy też tryb połączenia i ładowanie, również po kablu.

Wgrywasz na własną odpowiedzialność. Zawsze możesz wrócić do fabrycznego firmware.

## Skąd wziąć plik

Gotowy `keyglow-halo75-v2-ansi.bin` jest w [Releases](../../../releases). Buduje go GitHub z tej łatki (workflow „Firmware” w zakładce Actions), a sumę SHA-256 pliku widać w logu budowania.

## Czym się różni od fabrycznego 2.1.5

- nie ma dwóch skrótów do fabrycznego trybu testowego (Fn + M + R i Fn + M + T z przytrzymaniem), bo NuPhy nie opublikował ich kodu
- wybór efektu nie rusza już jasności paska ani klawiszy

## Wgrywanie

1. Jeśli masz firmware starszy niż 2.1.5, najpierw zaktualizuj klawiaturę oficjalnie, według instrukcji NuPhy, i sprawdź, czy wszystko działa (też 2.4 GHz i Bluetooth).
2. Zamknij KeyGlow i VIA.
3. Przestaw przełącznik trybu na kabel, odłącz kabel, przytrzymaj **Esc** i podłącz kabel z powrotem. Klawiatura przejdzie w tryb wgrywania.
4. W [QMK Toolbox](https://github.com/qmk/qmk_toolbox/releases) powinno się pojawić `STM32 DFU device connected`. Wybierz plik `keyglow-halo75-v2-ansi.bin` i kliknij **Flash**.
5. Po wgraniu przytrzymaj **Fn + [** przez 3 sekundy, żeby zresetować klawiaturę. To kasuje też sparowania Bluetooth.

Jeśli Windows zablokuje QMK Toolbox, ten sam plik wgrasz programem STM32CubeProgrammer od ST (połączenie USB, tryb DFU).

## Powrót do fabrycznego

Tak samo jak wyżej wgrywasz oficjalny plik ze strony NuPhy, `QMK_firmware_nuphy_halo75_v2_ansi_v2.1.5.bin` (SHA-1 `ae4e30576b6f669400a660b64613e7c3f73fbf6a`).

## Jak to jest zbudowane

- kod: [SRGBmods/NuphyQMK](https://github.com/SRGBmods/NuphyQMK) z commita `1ef99a7d83c10b747c0aa118540affaf5c5f8af5` i łatka `keyglow-side.patch`
- polecenie: `make nuphy/halo75_v2/ansi:via`

## Jak apka rozmawia z paskiem

Przez VIA, kanał 0:

| Polecenie | Bajty |
| --- | --- |
| sprawdzenie | `08 00 00` → `K G wersja` |
| odczyt wszystkiego | `08 00 10` → tryb A, tryb B, jasność, prędkość, tęcza, kolor, R, G, B |
| ustawienie | `07 00 10` + te same 9 bajtów |
| zapis w klawiaturze | `09 00 10` |
| stan | `08 00 2F` → bateria, ładowanie, połączenie, stan RF, Win/Mac, słaba bateria, uśpienie |
