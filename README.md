# sat2survey
A satellite-informed disaster assessment planner for prioritizing inspection sites and planning UAS survey routes.

## Favorite Quote

> "We should take care not to make the intellect our god;
> it has, of course, powerful muscles, but no personality."
>
> — Albert Einstein, *The Goal of Human Existence* (1943)

**Satellite-Informed UAS Disaster Assessment Planner**

Sat2Survey is a web application we're building for our CSE499 Senior Project at BYU–Idaho.

The idea is simple: satellite data can help us see where a disaster has happened, but how do we decide which areas a drone should inspect first when flight time is limited?

That's the problem we want to work on.

## What We're Building

Sat2Survey will use historical disaster data to help users identify important inspection sites and plan drone survey routes.

We'll start with flood data from the Copernicus Emergency Management Service (CEMS).

Rather than just displaying satellite data on a map, we want to develop our own algorithms to prioritize inspection sites and plan routes based on their importance, distance, and available flight time.

The goal is to explore how satellite observations and UAS technology can work together to support disaster assessment.

## Planned Features

### Core Features

- **Disaster Data Import:** Load historical flood data (GeoJSON) and inspection locations (CSV).
- **Site Prioritization:** Rank inspection locations based on their relationship to mapped flood areas and user-defined importance.
- **Route Planning:** Generate a proposed survey route based on site priorities, travel distance, inspection time, and flight-time limits, including the return trip.
- **Interactive Map:** Display disaster areas, inspection sites, and proposed routes.
- **Mission Management:** Save, view, edit, and delete mission plans.

### Possible Future Features

- Compare different route-planning methods.
- Export mission plans to QGroundControl for possible PX4/Gazebo simulation testing.
- Support wildfire hotspot data from NASA FIRMS.
- Analyze simulated flight results.

## Planned Tech Stack

| Technology | Purpose |
|---|---|
| Next.js / React | Web application |
| TypeScript | Application logic |
| Leaflet | Interactive maps |
| Turf.js | Geospatial calculations |
| SQLite / Prisma | Database and data storage |
| Vitest | Testing |
| GitHub | Version control and team collaboration |

The technology choices may change as the project develops.

## Project Scope

This project is being developed as part of a four-week team development schedule in CSE499.

To keep the project manageable, we'll start with one historical flood scenario and prepared datasets. The core features won't depend on paid services or live satellite APIs.

This is a research and simulation planning tool, not a system for controlling real drones or making operational emergency decisions.

## Project Status

**Planning / Initial Development**

We're currently setting up the repository, defining the core requirements, and preparing for development.

Setup instructions and project documentation will be added as the application takes shape.

## Data Sources

- [Copernicus Emergency Management Service](https://rapidmapping.emergency.copernicus.eu/)
- [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/)

Dataset-specific attribution and licensing information will be added when data is included in the project.

## Team

BYU–Idaho — CSE499 Senior Project

**Project proposed by:** Ririku Shirakawa

Team members will be added once the team is confirmed.