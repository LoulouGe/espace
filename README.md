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

## 🌍 Planètes & Campagne

Le jeu propose une campagne progressive où chaque corps céleste doit être posé avec succès pour débloquer la destination suivante.

| Planète | Difficulté | Dangers (Hazards) & Conditions |
|---------|-----------|------------|
| 🌕 **Lune** | ★☆☆☆☆ | Pas d'atmosphère, gravité faible. **Danger** : Pluie de météorites soudaine ! |
| ⚫ **Mercure** | ★★☆☆☆ | Terrain accidenté, gravité modérée. **Danger** : Éruptions solaires (coupent vos moteurs tactiques). |
| 🔴 **Mars** | ★★★☆☆ | Vent et tempêtes de poussière. **Danger** : Orages magnétiques (inversent le contrôle de rotation). |
| 🟠 **Titan** | ★★★☆☆ | Vents horizontaux forts et cisaillement. **Danger** : Rafales verticales descendantes soudaines. |
| 🌍 **Terre** | ★★★★☆ | Forte gravité et turbulences continues. **Danger** : Coups de foudre (déséquilibrent violemment le vaisseau). |
| 🌕 **Vénus** | ★★★★★ | Vents dévastateurs permanents. **Danger** : Pluies d'acide extrêmement corrosives (rongent le carburant 2× plus vite). |

## ✨ Dernières Nouveautés & Fonctionnalités

* 🐔 **Célébration d'Attérissage Exotique** : Si vous vous posez avec succès sans casser la fusée, une **petite poule en combinaison spatiale** sort triomphalement du vaisseau, sautille sur le sol extraterrestre et plante son drapeau !
* 🏆 **Leaderboards & Records Complets** : Le score final intègre votre temps, l'économie de carburant et la **précision de l'atterrissage** physique par rapport au centre de la rampe.
* 👻 **Système de Fantômes (Ghosts)** : Votre meilleur vol (record absolu sur la planète) est enregistré en continu. La prochaine fois que vous essaierez d'améliorer votre record, votre fantôme s'affichera en transparence pour faire la course contre vous !
* ⛽ **Carburant Global Persistant** : Attention, un mode "Carburant Global" persiste entre vos missions. Évitez les redémarrages catastrophiques par crash ! Notez aussi que le vol stationnaire (inertie sans utiliser les propulseurs à fond) draine une micro-réserve de carburant.
* ⚠️ **Avertisseur HUD Intelligent** : En cas de danger planétaire approchant (météore, foudre, tempête imminente...), un bandeau d'information rouge clignotant s'affiche en grand-angle temporairement en haut de l'écran.
* 🚀 **Inertie de Rotation (Physique)** : Les lois de la physique spatiale exigent anticipation ; lorsque vous pivotez le vaisseau, vos moteurs gyroscopiques ont désormais un seuil d'inertie (le vaisseau glisse dans sa rotation). Le point d'apparition et les vitesses initiales sont aussi générés aléatoirement.
* 🎥 **FX & Ambiance Visuelle** : 
  - Ombres portées dynamiques du vaisseau lors de l'approche finale.
  - Secousses et tremblements de l'écran (Camera Shake) pendant un crash important, des tempêtes violentes, ou à cause d'effets météorologiques puissants (Vénus).
  - Persistance post-crash avec trainées de fumées noires et des débris d'explosions stylisés.
  - Météores atmosphériques décoratifs tombant aléatoirement en couche de fond (Background).

## 🪐 Système solaire temps réel

* Naviguez depuis l'Espace en utilisant une carte en temps réel : les orbites planétaires correspondent à des tracés scientifiques selon l'heure de la date réelle de votre ordinateur.
* L'interface comprend un gestionnaire d'échelle temporelle : ×1 (temps réel), ×1000, ou bien ×100 000.

## 💻 GitHub Pages

Application compatible "Progressive Web App" & mobile / tactile à 2 doigts.
Pour l'hôte statique GitHub : `Settings → Pages → Branch: main → /root`
