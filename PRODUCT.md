# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Groups of friends or other movie night participants coordinating together. A participant identifies themselves by choosing their name from a session list.

## Product Purpose

CarciOscar helps a group decide what to watch, record the movie they watched, and understand the group's and each person's tastes. Success means the group can make a shared choice using current participants' interest, then keep a useful record of its viewing history and ratings.

## Positioning

The shared session combines attendance, movie proposals, pre-watch interest ratings, and post-watch scores. Presence-aware rankings reflect the people available to watch; group and individual statistics connect what people expected with what they thought afterward.

## Operating Context

The app is mobile first and designed for a group using a shared session URL. People mark themselves present, propose movies, rate proposals, choose from ranked results, and record ratings after watching. The URL selects a session; there are no user accounts. The selected person is remembered per session in a browser cookie.

## Capabilities and Constraints

- People can mark themselves present and propose up to three movies.
- Present members rate proposed movies from 1 to 5. Results use ratings from present members, require at least one present non-proposer vote, and exclude proposals from absent proposers.
- Watched movies receive individual 0 to 10 scores. Statistics include group and individual insights, awards, and genre analysis. Some general statistics can include global ratings regardless of presence.
- Movie search and metadata enrichment use TMDB with an OMDB fallback.
- There is no authentication. The URL is a session locator, not a database access boundary; public read policies on session-scoped tables are not filtered to the selected session.
- Deletion of watched movies and detailed ratings is disabled to preserve history.
- Display dates use DD/MM/YYYY.

## Brand Commitments

The product name is CarciOscar. Keep interface text concise and avoid instructions that repeat what controls already make clear.

## Evidence on Hand

The working product is implemented in this repository, including session, watched movie, and statistics flows. There are no established customer testimonials, market claims, or other marketing proof in the repository; do not fabricate them.

## Product Principles

- Let the people who are present shape the movie choice.
- Keep pre-watch interest distinct from post-watch opinion.
- Make the shared session usable without accounts, with identity selected within the session.
- Base rankings and statistics on recorded group activity.
