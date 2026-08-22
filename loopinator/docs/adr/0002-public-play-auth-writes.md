# Public Play links, sign-in for writes

A Musician opens a texted link and presses Play, without waiting for Church OS OAuth. The Library holds church audio, so no public page lists it. `/s/{id}` and `/t/{id}` stay public. Library, Setlists, Upload, and Save for everyone go through Better Auth, which the project already includes. The hamburger still shows those editor routes and sends signed-out people to the login page.
