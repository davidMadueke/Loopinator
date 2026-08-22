# Short unguessable ids, not pretty slugs

Public play without a login is only safe while nobody can guess a URL and no page lists the catalog. Paths like `/Sunday1` collide with app routes and leak names. Every Setlist and Track gets a short stable id used as `/s/{id}` or `/t/{id}`. Renaming leaves that id alone. Display names live in the UI.
