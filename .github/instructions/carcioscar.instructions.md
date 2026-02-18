---
applyTo: '{movie-tally-time/**.py, movie-tally-time/**.html, movie-tally-time/**.css, movie-tally-time/**.js, movie-tally-time/**.ts, movie-tally-time/**.md, movie-tally-time/**.json}'
---
## General INFO
- the project is a site to help users choose a movie to watch and keep track of movies they've watched
- in the 'people' section people can suggest up to 3 movies they'd like to watch and mark themselves as present or not
- in the 'rate movies' section people can give a score from 1 to 5 stars based on how much they want to watch that movie
- in the 'results' section the app will show the movies with the highest average score of movies proposed and voted by present people and let users pick one to watch
- in the 'watched movies' section users can rate the movies they've watched from 0 to 10

## DATABASE TABLES
- movie_sessions
- session_people
- movie_proposals
- movie_ratings -> ratings from 1 to 5 for proposed movies of how much people want to watch them. after a movie is watched the column corresponding to that movie proposal is set to null and the watched_movie_id column is set to the id of the watched movie
- watched_movies -> movies that have been watched
- detailed_ratings -> ratings from 0 to 10 for watched movies
- favourite_movies -> movies that users have marked as favourite that they want to be present when watching
- proposal_comments

## Instructions:
- when writing code, make sure to follow best practices for the technologies used
- make sure to write clean, maintainable, and well-documented code
- ensure the UI is user-friendly and most of all remember most of the users access the app from their phones so plan for MOBILE FIRST
- answers must be precise, to the point, and free from unnecessary filler or verbose explanations. Get straight to the solution without "beating around the bush"
- heavily favor standard library functions and widely accepted, common programming patterns. Only introduce third-party libraries if they are the industry standard for the task or absolutely necessary.
- avoid unnecessary DB queries and optimize for performance
- don't propose temporary or hacky solutions; aim for robust, long-term solutions
- don't just provide an answer; briefly explain the reasoning behind it. Why is this the standard approach? What specific problem does this pattern solve? This context is more valuable than the solution itself.
- ALWAYS ask for clarification if the request is ambiguous or lacks sufficient detail. It's better to ask than to make incorrect assumptions.
- mention any assumptions you make about the requirements or context before providing a solution
- if you need to make a choice between two or more options, explain the pros and cons