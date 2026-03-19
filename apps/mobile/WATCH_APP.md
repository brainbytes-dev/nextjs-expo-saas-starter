# Apple Watch Companion App — LogistikApp

## Übersicht

Die Apple Watch-App erweitert LogistikApp um schnelle Lager- und Werkzeug-Aktionen direkt am Handgelenk. Die native watchOS-App kommuniziert über das WatchConnectivity-Framework mit der iPhone-App.

## Architektur

```
┌─────────────────────┐     WatchConnectivity     ┌──────────────────────┐
│   iPhone (Expo/RN)  │ ◄─────────────────────► │  Apple Watch (Swift)  │
│                     │    Messages / Context     │                      │
│  watch-connectivity │                           │  WatchKit + SwiftUI  │
│  .ts (Bridge)       │                           │  LogistikWatch App   │
│                     │                           │                      │
│  useWatchSync.ts    │                           │  Complications       │
│  (React Hook)       │                           │  Glance View         │
│                     │                           │  Full App UI         │
│  watch.tsx          │                           │                      │
│  (Settings Screen)  │                           │                      │
└─────────────────────┘                           └──────────────────────┘
```

### React Native Seite (dieses Repo)

| Datei | Zweck |
|-------|-------|
| `src/lib/watch-connectivity.ts` | Bridge-Layer: Nachrichten senden/empfangen, Typen, Status-Abfragen |
| `src/hooks/useWatchSync.ts` | React Hook: Auto-Sync, App-State-Listener, Action-Handler |
| `app/(app)/watch.tsx` | Companion-Screen: Verbindungsstatus, manueller Sync, Feature-Übersicht |

### Native watchOS Seite (Xcode-Projekt erforderlich)

Die native Watch-App muss als separates WatchKit-Target im Xcode-Projekt erstellt werden. Sie wird **nicht** mit Expo/React Native gebaut.

## Watch-App Features

### Complications (Zifferblatt-Widgets)

- **Aktiver Timer**: Zeigt laufende Zeiterfassung mit Dauer
- **Offene Aufgaben**: Anzahl ausstehender Aufgaben als Zähler
- **Überfällige Werkzeuge**: Warnung wenn Werkzeuge überfällig sind

### Glance-Ansicht (Kurzblick)

- Aktuelle Werkzeugbuchungen (Name, seit wann)
- Timer-Status (läuft / gestoppt, Dauer)
- Schnellstatistiken (Materialien, offene Aufgaben)

### Vollständige App

| Feature | Beschreibung |
|---------|-------------|
| **Barcode Scanner** | watchOS-Kamera zum Scannen von Barcodes/QR-Codes, Ergebnis wird ans iPhone gesendet |
| **Timer Start/Stop** | Zeiterfassung starten und stoppen mit einem Tap |
| **Werkzeug Check-in** | Schnelles Einchecken eines Werkzeugs |
| **Werkzeug Check-out** | Schnelles Auschecken eines Werkzeugs |
| **Buchungsübersicht** | Liste aktiver Werkzeugbuchungen |

## Kommunikationsprotokoll

### iPhone → Watch

| Message Type | Payload | Beschreibung |
|-------------|---------|-------------|
| `full_sync` | `WatchSyncPayload` | Vollständiger Datenabgleich |
| `sync_bookings` | `ToolBooking[]` | Werkzeugbuchungen aktualisieren |
| `sync_timer` | `ActiveTimer \| null` | Timer-Status aktualisieren |

### Watch → iPhone

| Action Type | Data | Beschreibung |
|------------|------|-------------|
| `scan_result` | `{ barcode: string }` | Gescannter Barcode |
| `timer_start` | — | Timer starten |
| `timer_stop` | — | Timer stoppen |
| `checkin` | `{ toolId?: string }` | Werkzeug einchecken |
| `checkout` | `{ toolId?: string }` | Werkzeug auschecken |
| `request_sync` | — | Sync anfordern |

## Technologie-Stack (Native Watch-App)

| Komponente | Technologie |
|-----------|-------------|
| UI Framework | SwiftUI |
| App Lifecycle | WatchKit |
| Kommunikation | WatchConnectivity (WCSession) |
| Complications | ClockKit / WidgetKit |
| Barcode Scanner | AVFoundation (watchOS Kamera) |
| Persistence | UserDefaults / Core Data |
| Min. watchOS | 9.0+ |

## Setup-Anleitung

### 1. Native Watch-App erstellen

```
1. Xcode öffnen → File → New → Target
2. watchOS → Watch App auswählen
3. "LogistikWatch" als Name
4. SwiftUI als Interface
5. WatchKit App als Lifecycle
```

### 2. WatchConnectivity in Swift einrichten

```swift
import WatchConnectivity

class WatchSessionManager: NSObject, WCSessionDelegate {
    static let shared = WatchSessionManager()

    func activate() {
        if WCSession.isSupported() {
            let session = WCSession.default
            session.delegate = self
            session.activate()
        }
    }

    func session(_ session: WCSession, didReceiveMessage message: [String : Any]) {
        // Daten von iPhone empfangen und UI aktualisieren
    }

    func sendAction(_ type: String, data: [String: Any] = [:]) {
        let message: [String: Any] = [
            "type": type,
            "data": data,
            "timestamp": Date().timeIntervalSince1970
        ]
        WCSession.default.sendMessage(message, replyHandler: nil)
    }
}
```

### 3. React Native Bridge installieren

```bash
cd apps/mobile
pnpm add react-native-watch-connectivity
npx pod-install
```

### 4. Expo Config Plugin (optional)

Für Expo Managed Workflow muss ein Config Plugin erstellt werden, das das WatchKit-Target automatisch zum Xcode-Projekt hinzufügt.

## Einschränkungen

- **Kein Expo-Support**: watchOS-Apps können nicht mit Expo/React Native gebaut werden. Die Watch-App muss nativ in Swift/SwiftUI entwickelt werden.
- **Nur iOS**: Apple Watch ist ausschliesslich mit iPhones kompatibel.
- **Kamera-Einschränkungen**: Die watchOS-Kamera hat eine niedrigere Auflösung als die iPhone-Kamera. Barcode-Scanning funktioniert nur bei guten Lichtverhältnissen.
- **Batterie**: Häufige Kommunikation zwischen Watch und iPhone kann den Akku belasten. Die Sync-Frequenz ist deshalb gedrosselt.
