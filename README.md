# 🚀 Space Lander

Un simulateur d'atterrissage spatial 2D avec système solaire en temps réel.

## Jouer

👉 [Jouer en ligne](https://loulouge.github.io/espace)

## Comment jouer

| Touche | Action |
|--------|--------|
| `↑` | Propulseur principal |
| `← →` | Rotation du vaisseau |
| `Espace` | Rétrofusée (freinage) |

**Objectif :** Atterrir sur la zone désignée en moins de temps possible, avec le moins de carburant possible.

**Crash si :**
- Vitesse verticale trop élevée à l'impact
- Vitesse horizontale trop élevée
- Angle d'inclinaison trop grand
- Atterrissage hors de la zone

## Planètes / Niveaux

| Planète | Difficulté | Conditions |
|---------|-----------|------------|
| 🌕 Lune | ★☆☆☆☆ | Pas d'atmosphère, faible gravité |
| ⚫ Mercure | ★★☆☆☆ | Terrain accidenté, gravité modérée |
| 🔴 Mars | ★★★☆☆ | Vent, tempêtes de poussière |
| 🟠 Titan | ★★★☆☆ | Vents forts, cisaillement |
| 🌍 Terre | ★★★★☆ | Forte gravité, turbulences |
| 🌕 Vénus | ★★★★★ | Vents dévastateurs, gravité forte |

## Système solaire temps réel

- Les positions planétaires sont calculées à partir de la date réelle actuelle
- Contrôles de vitesse : ×1 (temps réel), ×1000, ×100K

## GitHub Pages

Pour activer : `Settings → Pages → Branch: main → /root`
