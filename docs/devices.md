# Devices

The Devices page groups entities by domain and device type.

## Overview

On mobile, opening Devices first shows a device overview. From there you can open a group such as lights, covers, people, maintenance or energy.

Every group has the same page header as the area pages, with a back button to the overview, and uses the same page width. On desktop only the group list and the group itself scroll, so the page never shows a second scrollbar.

## Device Groups

Common groups include:

- New devices
- Maintenance
- Energy
- Lights
- Switches
- Covers
- Climate
- Cameras
- People
- Sensors

The visible groups can be changed in Dashboard settings, Devices page. The same page can hide single entities from the Devices page only, without hiding them in the rooms.

Inside a group the entities are listed per room, with the icon of each room. Lights, switches, fans, covers and locks get an action per room in the room heading:

- Lights, switches and fans: a switch that shows how many are on, for example **2/5**, when the room has more than one. It switches everything in the room off, or on when everything is off.
- Covers: open and close all covers of the room.
- Locks: lock and unlock all locks of the room. Unlocking always asks for confirmation.

The other room actions ask first when the master action confirmations in Dashboard settings are on for that type.

## Hidden And Unavailable Entities

Entities without an area are not shown in Dwains Dashboard. Unavailable entities are hidden by default and can be enabled in Dashboard settings.

## Maintenance

Maintenance focuses on entities that need attention, such as low battery entities and unavailable entities when enabled.

## Energy

The Energy page shows live power usage by area. It uses power entities from Home Assistant and groups them by area.

- **Whole house** shows the total with a graph of the last day. When a grid power sensor is set in the Home Assistant energy settings, the total and the graph come from those sensors (grid, solar and battery). Otherwise the total is the sum of the rooms.
- **Top area** is the room that uses the most right now, with its three biggest consumers.
- Every room gets a card with its total, a graph and its power sensors, each with a bar for its share of the room.

Graphs only include sensors with long term statistics (a state class). The House power usage popup on Home shows the same overview.
