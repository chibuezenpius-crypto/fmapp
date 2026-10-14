# Football Manager Mobile App Architecture

## Core UI/UX Rules
- Mobile-First Vertical Layout: Max width `max-w-md` (480px), centered on desktop views with a dark sports dashboard background.
- Fixed Top Navigation Header: Displays Manager Name, Club Name, Transfer Budget, and Current In-Game Date.
- Fixed Bottom Navigation Bar: Switch main screens (Home/Dashboard, Squad, Tactics, Transfers, League, Matches).
- Global Navigation: A visible, clickable top-left back arrow (`ArrowLeft`) is required across all detail views, modals, and sub-screens to return smoothly to the previous view.

## Detailed Sub-Menu Requirements

1. **Player Profile View (6 Sub-menus)**:
- `Overview`: 24 key attributes (Short Passing, Dribbling, Technique, Shooting, Heading, Tackling, Strength, Stamina, Vision, Teamwork, etc.), Fitness %, Form rating, and Mood badges.
- `Personal Info`:
- Personal Details: Date of birth, Place of birth, Height, Preferred foot.
- Nationalities: Dedicated card displaying Primary and Secondary nationalities with country flag badges (e.g., Primary: Nigeria, Secondary: Angola).
- Languages: Languages spoken & proficiency levels.
- Off the Pitch / Hobbies & Team Opinion: Player hobbies and morale/relationship status with the group.
- Personality & Character: Primary Personality Archetype (e.g., "Model Professional", "Resolute", "Mercenary", "Perfectionist") and Character Traits badges (e.g., Loyal, Ambitious, Disruptive, Professional).
- `Contracts`: Contract details, Negotiations, Interested Clubs, Offer history (Accepts/Declines/Reasons), Active Sponsor Contract.
- `History`: Career transfer moves, Fees, Season-by-season statistics, Overall total career stats summary.
- `Relationships`: Morale with manager, teammates, favorite clubs/personnel.
- `Achievements`: Career trophies, individual awards, season recognitions.

2. **Club Profile View (5 Sub-menus)**:
- `Overview`: Team kits visual representation, primary club summary, stadium details, and general information.
- `Squad`: Roster list with sorting/filtering by position, age, and value. Clicking any player opens their interactive Player Profile.
- `Tactics`: Formation setup and role assignments.
- `Staffs`: Club coaching and backroom staff profiles.
- `History`: Historical club achievements, past season standings, legendary records.
- `Finances & Facilities`: Sponsorships, stadium capacity, youth facility levels, and wage/transfer budgets.

3. **League View & Competitions Navigation**:
- Multi-Level Navigation: Top-level category selector (`Domestic Leagues` | `Continental Competitions` | `International`).
- Country / Region Accordions: Clicking a country drops down its league hierarchy (e.g., Premier Division, Championship, Cup).
- `League Table`: Current standings (Pts, GD, W/D/L, GF/GA). Expandable season selector.
- `Player Stats`: Sub-menus for Goals, Assists, Clean Sheets, Yellow/Red cards, Average Rating.
- `Team Stats`: Possession, Goals Scored, Clean Sheets, Cards.
- `Rules`: Promotion/relegation rules, squad registration rules, transfer windows.
- `History`: Past champions, runners-up, total points history.

4. **Transfer Market (Nova-Style Vertical Row Layout)**:
- Clean vertical list item featuring exactly 10 pieces of information per player row:
1. Player Avatar / Face
2. Player Name (Prominent font/color)
3. Club Name (Positioned directly under player name in smaller muted font/color)
4. Age
5. Position (e.g., ST, CM, CB)
6. Nationality Flag
7. Overall Rating (Badge/Circle)
8. Market Value
9. Release Clause
10. Interactive Shortlist / Follow Star Button (`★`/`☆`) to toggle player tracking.

5. **Match Info & Personnel Profiles (Clickable Entities)**:
- `Referee Profile (Single Page Modal)`: Name, age, primary nationality, languages spoken, strictness level (Lenient/Balanced/Strict), card tendency (Yellows/Reds per game), and foul threshold.
- `Manager / Coach Profile (3 Sub-menus)`:
- `Overview & Attributes`: Age, nationality, personal info, key attributes (Tactical Knowledge, Man Management, Discipline), and Personality Archetype.
- `Tactics & Style`: Preferred formation (e.g., 4-3-3, 3-5-2) and tactical DNA (Passing style, pressing intensity).
- `Achievements & History`: Trophies won, individual awards, and past clubs managed season-by-season records.
- `Match Overview`: Stadium/Venue, Referee (Clickable), Weather, Kick-off time, Managers (Clickable), and Key Players to Watch.
- `Head-to-Head`: Last 5 match form indicators, all-time head-to-head record between both teams.
- `Lineups`: Tactical formations, starting XI, and substitutes bench.
- `Commentary`: Minute-by-minute text events ticker log with minute badges.
- `Match Stats`: Interactive statistical bar charts (Possession, Shots, Pass Accuracy, Fouls).
