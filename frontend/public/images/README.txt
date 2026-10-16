Put the homepage corner shapes here as PNGs (transparent background), named exactly:

  hero-top-left.png
  hero-top-right.png
  hero-bottom-left.png
  hero-bottom-right.png

Any file that is missing is replaced by the built-in ring shape.
To adjust size or position, edit .hero-shape.tl / .tr / .bl / .br in src/App.css.

Sign-up characters (transparent PNGs, cut from the uniform illustration):

  signup-student.png        "Join an organization" card (half body, right arm removed)
  signup-leader.png         "Register my organization" card (half body, right arm removed)
  signup-student-upper.png  that sleeve and upper arm, and
  signup-student-arm.png    that forearm: put back behind the body; they wave on hover
  signup-leader-upper.png   (positions: src/components/SignUpChooser.jsx, ARMS)
  signup-leader-arm.png
  signup-student-hand.png   the resting hand (raised, the app draws an open palm instead)
  signup-leader-hand.png
  signup-student-head.png   head and shoulders, for the banner on the sign-up form
  signup-leader-head.png    head and shoulders, for the banner on the sign-up form

The two figures share the same crop height (he's taller, so she has space above her head).

Replace these files to change a character (then bump ART_VERSION in SignUpChooser.jsx); sizes are set in src/App.css ("Sign up, step 1").
