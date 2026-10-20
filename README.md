# KeyGlow

Prosta apka do zmiany podświetlenia w klawiaturze **NuPhy Halo75 V2**.

Zrobiłem ją, bo normalnie nie da się tego wygodnie ustawić: VIA nie ma tej klawiatury na liście, a z plikami JSON jest tylko kombinowanie. Tutaj podłączasz klawiaturę i po prostu klikasz.

![KeyGlow](docs/screenshot.png)

| Kolory klawiszy | Funkcje klawiszy |
| --- | --- |
| ![Kolory klawiszy](docs/kolory-klawiszy.png) | ![Funkcje klawiszy](docs/funkcje-klawiszy.png) |

<p align="center"><img src="docs/waskie-okno.png" alt="KeyGlow w wąskim oknie" width="300"></p>

## Co umie

- zmienia efekt (jest ich 43, poukładane w zakładki)
- zmienia kolor, jasność i prędkość
- **kolory klawiszy**: zaznaczasz kursorem dowolne klawisze i dajesz im własny kolor
- **funkcje klawiszy**: klikasz klawisz i zmieniasz, co robi (np. Caps Lock jako Esc), osobno dla Windowsa i Maca
- **zapisane ustawienia**: gotowe zestawy (np. Czerwień, Biały do pracy, Matrix) i Twoje własne, zapisane pod dowolną nazwą
- **skróty**: lista wszystkich skrótów Fn i Fn + M, odczytana z Twojej klawiatury
- wyłącza i włącza pasek dookoła obudowy (też na fabrycznym firmware)
- kilka motywów kolorystycznych apki (Morski, Fiolet, Wiśnia, Grafit, Las)
- przycisk **Przywróć domyślne** wraca do fabrycznego podświetlenia NuPhy
- od razu pokazuje, jak to wygląda na klawiaturze
- pokazuje, jak klawiatura jest podłączona (kabel, odbiornik 2.4 GHz albo Bluetooth) i ile ma baterii
- wszystko zapisujesz przyciskiem **Zapisz** (albo Ctrl+S): ustawienia zostają w klawiaturze i na komputerze
- po podłączeniu sama wgrywa zapisane ustawienia
- włącza się razem z systemem i siedzi cicho przy zegarze (można to wyłączyć)

## Jak zainstalować

### Najprościej: z przeglądarki

Otwórz stronę KeyGlow (GitHub Pages tego repozytorium) w Chrome albo Edge i kliknij **Zainstaluj** w prawym górnym rogu. KeyGlow pojawi się w menu Start i na pasku zadań jak zwykła aplikacja i działa też bez internetu. Nie pobierasz żadnego pliku `.exe`, więc Windows niczego nie blokuje. W Edge przy instalacji możesz od razu zaznaczyć uruchamianie razem z systemem.

### Wersja na komputer

Pobierasz ją z [Releases](../../releases). Ma ikonę przy zegarze, sama startuje z systemem i pokazuje baterię przy Bluetooth.

| System | Plik |
| --- | --- |
| Windows | `KeyGlow-Setup-….exe` |
| macOS (M1 i nowsze) | `KeyGlow-…-arm64.dmg` |
| macOS (Intel) | `KeyGlow-…-x64.dmg` |
| Ubuntu / Debian | `keyglow_…_amd64.deb` |
| inny Linux | `KeyGlow-….AppImage` |

Potem podłącz klawiaturę **kablem USB-C**. Apka sama ją znajdzie.

**Windows:** jeśli pojawi się niebieskie okno SmartScreen, kliknij „Więcej informacji”, a potem „Uruchom mimo to”. Jeśli masz włączoną **Kontrolę aplikacji inteligentnej** (Smart App Control), Windows nie uruchomi pliku `.exe`, bo nie ma płatnego podpisu. Wtedy zainstaluj KeyGlow z przeglądarki, tak jak wyżej.

**macOS:** przy pierwszym uruchomieniu wejdź w Ustawienia systemowe → Prywatność i ochrona i kliknij „Otwórz mimo to” (apka nie ma płatnego podpisu od Apple).

**Linux z AppImage:** raz dodaj regułę, żeby apka miała dostęp do klawiatury, i podłącz ją ponownie:

```bash
sudo cp build/linux/50-keyglow.rules /etc/udev/rules.d/ && sudo udevadm control --reload-rules && sudo udevadm trigger
```

Na Ubuntu AppImage potrzebuje jeszcze `libfuse2` (na 24.04 `libfuse2t64`). Przy `.deb` wszystko dzieje się samo.

## Wersja w przeglądarce

Działa też bez instalowania, w Chrome, Edge albo Operze, na każdym systemie (strona z GitHub Pages). Klikasz „Połącz klawiaturę” i wybierasz Halo75 V2.

## Firmware z paskiem

Fabryczny firmware nie pozwala ustawiać paska dookoła obudowy z komputera. Przygotowałem [własny firmware](firmware/), po którego wgraniu pasek ustawiasz w apce. Wszystko jest opisane w [firmware/README.md](firmware/README.md), razem z powrotem do fabrycznego.

## Dobrze wiedzieć

- podświetlenie da się zmieniać tylko po kablu, z przełącznikiem trybu ustawionym na kabel (przez 2.4 GHz i Bluetooth klawiatura nie przyjmuje ustawień); potem możesz wrócić do bezprzewodowego, ustawienia zostają w klawiaturze
- procent baterii apka pokazuje przez Bluetooth; przy kablu klawiatura się ładuje i firmware go nie podaje (apka pokazuje wtedy ostatni procent z Bluetooth). Na klawiaturze odłącz kabel i naciśnij Fn + \: zielony to powyżej 80%, żółty do 80%, czerwony do 50%, a poniżej 10% pasek miga
- na fabrycznym firmware zmiana efektu w apce zapala pasek przygaszony do zera skrótami (wraca na środkowy poziom), tak działa firmware NuPhy
- kolorów pojedynczych klawiszy nie da się zapisać w samej klawiaturze, więc pamięta je apka i wgrywa po podłączeniu
- na fabrycznym firmware pasek dookoła obudowy zmienia się skrótem Fn + M + strzałki (albo przypisz te skróty do innych klawiszy w „Funkcjach klawiszy”); z [firmware z paskiem](firmware/) ustawiasz go w apce
- to nie jest oficjalna aplikacja NuPhy

## Dla programistów

```bash
npm install
npm start
```

`npm run dist` robi instalator dla systemu, na którym jesteś (folder `dist`). `npm run dist:store -- "-c.appx.identityName=…" "-c.appx.publisher=CN=…"` (dane z Partner Center) robi paczkę do Microsoft Store, a `npm run icon` rysuje wszystkie ikony z `src/assets/logo.svg`.

## Licencja

MIT
