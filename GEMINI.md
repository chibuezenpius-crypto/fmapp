# Football Manager Mobile App Architecture

## Core UI/UX Rules
- Mobile-First Vertical Layout: Max width `max-w-md` (480px), centered on desktop views with a dark sports dashboard background.
- Fixed Top Navigation Header: Displays Manager Name, Club Name, Transfer Budget, and Current In-Game Date.
- Fixed Bottom Navigation Bar: Switch main screens (Home/Dashboard, Squad, Tactics, Transfers, League, Matches).
- Global Navigation: A visible, clickable top-left back arrow (`ArrowLeft`) is required across all detail views, modals, and sub-screens to return smoothly to the previous view.

## Detailed Sub-Menu Requirements

1. **Player Profile View (6 Sub-menus)**:
- `Overview`: 24 key attributes cleanly categorized (Technical: Short Passing, Dribbling, Technique, Shooting, Heading, Tackling; Physical: Strength, Stamina, Speed, Agility; Mental: Vision, Teamwork, Work Rate, Composure, etc.), Fitness %, Form rating, and Mood badges.
- `Personal Info`:
- Personal Details: Date of birth, Place of birth, Height, Preferred foot.
- Nationalities: Dedicated card displaying Primary and Secondary nationalities with SVG country flag badges (e.g., Primary: 🇳🇬 Nigeria, Secondary: 🇦🇴 Angola). Clicking any flag opens that country's default overview screen.
- Languages: Languages spoken & proficiency levels.
- Off the Pitch / Hobbies & Team Opinion: Player hobbies and morale/relationship status with the group.
- Personality & Character Engine: Display exactly 1 Primary Personality Archetype badge (e.g., "Model Professional") and exactly 1 Character Trait badge (e.g., "Loyal").
- `Contracts`: Contract details (expiry, weekly wage), Negotiations, Interested Clubs, Offer history table (Accepts/Declines/Reasons), and Active Sponsor Contract (1 active sponsor).
- `History`: Career transfer moves, Fees, Season-by-season statistics, Overall total career stats summary.
- `Relationships`: Morale with manager, teammates, favorite clubs/personnel.
- `Achievements`: Career trophies, individual awards, season recognitions.

2. **Tactics Hub (5 Functional Sub-menus)**:
- `Overview (Pitch & Swap)`: 2D tactical pitch view displaying 11 starting player cards in formation slots. Tap-to-swap player selection between pitch and bench/reserves. Features **Auto Pick** (populates best XI based on OVR & fitness) and **Clear Pitch** buttons.
- `Player Roles`: Specific tactical role assignments per position (e.g., Inside Forward, Ball Playing Defender, Sweeper Keeper, Advanced Forward).
- `Set Pieces`: Taker assignments for Corner Kicks (Left/Right), Free Kicks (Short/Long), and Penalties (1st, 2nd, and 3rd choice).
- `Captains & Leadership`: Assign Captain (1st Choice) and Vice-Captains (2nd, 3rd, 4th Choice) with leadership influence badges (e.g., Very High, High, Influential).
- `Formations & Style`: Formation Library selector (4-3-3, 4-2-3-1, 3-5-2, 4-4-2) and Tactical Mentality/Style controls (Gegenpress, Tiki-Taka, Counter-Attack, Attacking/Defensive mindset).

3. **Club Profile View (5 Sub-menus)**:
- `Overview`: Team kits visual representation, primary club summary, stadium details (name, capacity), manager info, and general club overview.
- `Squad`: Roster list with sorting/filtering by position, age, and value. Clicking any player opens their interactive Player Profile.
- `Tactics`: Direct quick link to the Tactics Hub.
- `Staffs`: Club coaching and backroom staff profiles.
- `History`: Historical club achievements, past season standings, legendary records.
- `Finances & Facilities`: Sponsorships, stadium capacity, youth facility levels, and wage/transfer budgets.

4. **League View & Competitions Navigation**:
- Competition Explorer: Country/Region accordions (England, Nigeria, Spain, etc.).
- Competition Detail View (5 Sub-menus): Tapping any league opens its dedicated view with a full 20-team standings table (`Standings` [default 20-team table], `Player Stats` [with sub-tabs for Goals, Assists, Clean Sheets, Cards, Rating], `Team Stats`, `Rules`, `History`).

5. **Transfer Market (Nova-Style 10-Info Vertical Row Layout)**:
- Clean vertical list item featuring exactly 10 pieces of information per player row:
1. Player Avatar / Face
2. Player Name (Prominent/bold font)
3. Club Name (Positioned directly under player name in smaller muted font/color)
4. Age
5. Position badge (e.g., ST, CM, CB)
6. SVG Country Flag (Clickable to open country overview)
7. Overall Rating (Badge/Circle)
8. Market Value
9. Release Clause / Wage
10. Interactive Shortlist / Follow Star Button (`★`/`☆`) to toggle player tracking.

6. **Matches & Match Center (FotMob-Style List + 5 Detail Sub-menus)**:
- `Matches Main Tab`: Clean vertical match list grouped by competition (e.g., Champions League, Premier Division) showing Home Club, Crests, Kick-off Time or Live Score, and Away Club.
- `Match Detail View (5 Sub-menus)`:
- `Overview`: Stadium/Venue, Referee (Clickable Modal), Weather, Kick-off time, Managers (Clickable Modal), Key Players to Watch.
- `Head-to-Head`: Recent 5-match form indicators, all-time head-to-head record between both clubs.
- `Lineups`: Tactical pitch views for both starting XIs + substitutes.
- `Commentary`: Minute-by-minute text commentary log for simulated matches.
- `Match Stats`: Interactive statistical bar charts (Possession %, Shots, Pass Accuracy, Fouls).
- `Clickable Personnel Modals`:
- `Referee Modal`: Name, age, flag, languages, strictness level badge (Lenient/Balanced/Strict), card tendencies (Yellows/Reds per game), and foul threshold.
- `Manager Profile (3 Sub-menus)`: Overview & Attributes (key manager stats, personality), Tactics & Style (preferred formation, tactical DNA), and Achievements & History.
