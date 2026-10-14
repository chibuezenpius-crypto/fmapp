# Football Manager Mobile App Architecture

## Core UI/UX Rules
- Mobile-First Vertical Layout: Max width `max-w-md` (480px), centered on desktop views with a dark sports dashboard background.
- Fixed Top Navigation Header: Displays Manager Name, Club Name, Transfer Budget, and Current In-Game Date.
- Fixed Bottom Navigation Bar: Switch main screens (Home/Dashboard, Squad, Tactics, Transfers, League, Matches).

## Detailed Sub-Menu Requirements

1. **Player Profile View (6 Sub-menus)**:
- `Overview`: 24 key attributes (Short Passing, Dribbling, Technique, Shooting, Heading, Tackling, Strength, Stamina, Vision, Teamwork, etc.), Fitness, Form, Mood.
- `Personal Info`: Languages & proficiencies, Nationalities, Place of Birth, Hobbies, Team Opinion/Relationship.
- `Contracts`: Contract details, Negotiations, Interested Clubs, Offer history (Accepts/Declines/Reasons), Active Sponsor Contract.
- `History`: Career transfer moves, Fees, Season-by-season statistics, Overall total career stats summary.
- `Relationships`: Morale with manager, teammates, favorite clubs/personnel.
- `Achievements`: Career trophies, individual awards, season recognitions.

2. **Club Overview (5 Sub-menus)**:
- `Overview`: Club summary, Manager info, Stadium details, Finances.
- `Squad`: Roster list with sorting/filtering by position, age, and value.
- `Tactics`: Formation setup and role assignments.
- `History`: Historical club achievements, past season standings, legendary records.
- `Finances & Facilities`: Sponsorships, stadium capacity, youth facility levels.

3. **League View (5 Sub-menus)**:
- `League Table`: Current standings (Pts, GD, W/D/L, GF/GA). Expandable season selector.
- `Player Stats`: Sub-menus for Goals, Assists, Clean Sheets, Yellow/Red cards, Average Rating.
- `Team Stats`: Possession, Goals Scored, Clean Sheets, Cards.
- `Rules`: Promotion/relegation rules, squad registration rules, transfer windows.
- `History`: Past champions, runners-up, total points history (expandable past seasons).

4. **Match Info Modal / Screen (5 Sub-menus)**:
- `Overview`: Stadium/Venue, Referee, Weather, Kick-off time, Managers, Key Players to Watch.
- `Head-to-Head`: Last 5 match form for both teams, all-time record between the two teams.
- `Lineups`: Tactical formations, starting XI, substitutes.
- `Commentary`: Minute-by-minute text events ticker (available during/after match).
- `Match Stats`: Shots, Possession, Pass Accuracy, Fouls.
