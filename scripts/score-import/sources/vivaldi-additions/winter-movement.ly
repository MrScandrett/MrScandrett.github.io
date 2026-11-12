\version "2.26.0"
\include "winter2.ly"
\include "winter2a.ly"
\include "winter2b.ly"
\include "winter2c.ly"
\include "winter2d.ly"
\score { <<
\new Staff { \ViolinoPrincipaleWinterTwo }
\new Staff { \ViolinoPrimoWinterTwo }
\new Staff { \ViolinoSecondoWinterTwo }
\new Staff { \AltoViolaWinterTwo }
\new Staff { \VioloncelloWinterTwo }
>> \layout {} \midi { \tempo 4 = 80 } }
