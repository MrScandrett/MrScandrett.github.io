\version "2.26.0"
\include "summer3.ly"
\include "summer3a.ly"
\include "summer3b.ly"
\include "summer3c.ly"
\include "summer3d.ly"
\score { <<
\new Staff { \ViolinoPrincipaleSummerThree }
\new Staff { \ViolinoPrimoSummerThree }
\new Staff { \ViolinoSecondoSummerThree }
\new Staff { \AltoViolaSummerThree }
\new Staff { \VioloncelloSummerThree }
>> \layout {} \midi { \tempo 4 = 80 } }
