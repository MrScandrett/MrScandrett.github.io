\version "2.26.0"
% automatically converted by musicxml2ly from /tmp/jesu-normalized.musicxml
\pointAndClickOff

\include "articulate.ly"

%% additional definitions required by the score:
D = \tweak Stem.direction #DOWN \etc
U = \tweak Stem.direction #UP \etc


\header {
  composer = \markup \normal-text \normalsize "#"
  title = \markup \normal-text \normalsize \fontsize #-1.705 \bold
  "Jesu bleibet meine Freude / aus BWV147 / arr. J. Knuth"
  "id: software" = "MuseScore Studio 4.6.5"
  "id: encoding-date" = "2026-11-13"
}
#(set-global-staff-size 17.526897637795276)
\paper {
  paper-width = 21.59\cm
  paper-height = 27.94\cm
  top-margin = 1.5\cm
  bottom-margin = 1.5\cm
  left-margin = 1.5\cm
  right-margin = 1.5\cm
  indent = 1.66\cm
  short-indent = 0.38\cm
}
\layout {
  \context {
    \Staff
    printKeyCancellation = ##f
  }
  \context {
    \Score
    doubleRepeatBarType = ":|.|:"
    autoBeaming = ##f
  }
}
PartPOneVoiceOne = \relative b' {
  \clef "treble" \time 9/8 \key c \major s8*9 | % 1
  \oneVoice R8*9 | % 2
  R8*9 | % 3
  \break R8*9 | % 4
  \break R8*9 | % 5
  R8*9 | % 6
  \repeat volta 2 {
    R8*9 | % 7
    \pageBreak R8*9 \bar "||" % 8
    \break \key g \major \voiceOne \U b2. ^\markup \concat { \fontsize #1.175
      \bold "1. " \fontsize #1.175 \bold "2." } \U c4. | % 9

    \barNumberCheck #10
    \U d2. \U d4. | % 10
    \U c2. \U b4. | % 11
    \U a4. \U a4. r4. \break | % 12
    r2. r4. | % 13
    \U b2. ^\markup \concat { \fontsize #1.175 \bold "1. " \fontsize #1.175
      \bold "2." } \U c4. | % 14
    \U d2. \U b4. \pageBreak | % 15
    \U a8. ( [ \U b16. \U c16. ) ] \U b4. ( \U a4. ) \break | % 16
    \U g2. ^\markup \concat { \fontsize #1.175 \bold "1. " \fontsize #1.175
      \bold "2." } r4. | % 17
    r2. r4. | % 18
    r2. r4. \break | % 19

    \barNumberCheck #20
    r2. r4. \pageBreak | % 20
    r2. r4. | % 21
    r2. r4. | % 22
    r2. r4. \break | % 23
    \U b2. ^\markup \concat { \fontsize #1.175 \bold "1. " \fontsize #1.175
      \bold "2." } \U c4. \break | % 24
    \U d2. ^\markup \concat { \fontsize #1.175 \bold "1. " \fontsize #1.175
      \bold "2." } \U d4. | % 25
    \U c2. \U b4. | % 26
    \U a4. \U a4. r4. | % 27
    \oneVoice R8*9 | % 28
    \pageBreak \voiceOne \U b2. ^\markup \concat { \fontsize #1.175 \bold "1. "
      \fontsize #1.175 \bold "2." } \U c4. | % 29

    \barNumberCheck #30
    \U d2. \U b4. | % 30
    \U a8. ( [ \U b16. \U c16. ) ] \U b4. ( \U a4. ) \break | % 31
    \U g2. r4. \break | % 32
    r2. r4. | % 33
    r2. r4. | % 34
    r2. r4. \pageBreak | % 35
    r2. r4. \break | % 36
    r2. r4. | % 37
    r2. r4. | % 38
    r2. r4. \break | % 39

    \barNumberCheck #40
    \U a2. ^\markup \concat { \fontsize #1.175 \bold "1. " \fontsize #1.175
      \bold "2." } \U b4. \pageBreak | % 40
    \U c2. ^\markup \concat { \fontsize #1.175 \bold "1. " \fontsize #1.175
      \bold "2." } \U c4. | % 41
    \U b4. ~ ( \U b8. [ \U c16. \U d16. ) ] \U b4. | % 42
    \U a4. \U a4. r4. \break | % 43
    r2. r4. \break | % 44
    r2. r4. | % 45
    \U c2. ^\markup \concat { \fontsize #1.175 \bold "1. " \fontsize #1.175
      \bold "2." } \U d4. | % 46
    \U e2. \U e4. \pageBreak | % 47
    \U d4. ~ ( \U d8. [ \U e16. \U f16. ) ] \U d4. \break | % 48
    \U c4. ^\markup \concat { \fontsize #1.175 \bold "1. " \fontsize #1.175
      \bold "2." } \U c4. r4. | % 49

    \barNumberCheck #50
    r2. r4. | % 50
    r2. r4. \break | % 51
    \U b2. ^\markup \concat { \fontsize #1.175 \bold "1. " \fontsize #1.175
      \bold "2." } \U c4. \pageBreak | % 52
    \U d2. ^\markup \concat { \fontsize #1.175 \bold "1. " \fontsize #1.175
      \bold "2." } \U d4. | % 53
    \U c4. \U b2. | % 54
    \U a2. r4. \break | % 55
    r2. r4. \break | % 56
    \U b2. ^\markup \concat { \fontsize #1.175 \bold "1. " \fontsize #1.175
      \bold "2." } \U c4. | % 57
    \U d2. \U b4. | % 58
    \U a8. ( [ \U b16. \U c16. ) ] \U a2. \pageBreak | % 59

    \barNumberCheck #60
    \U g2. ~ \U g4. \break | % 60
    r2. r4. | % 61
    r2. r4. | % 62
    r2. r4. \break | % 63
    r2. r4. \break | % 64
    r2. r4. | % 65
    r2. r4. | % 66
    r2. r4. \pageBreak | % 67
    r2. r4. | % 68
    r2. r4. }
  | % 69

  \barNumberCheck #70
  r2. r4. \break | % 70
  r2. r4. \bar "|."
}

PartPOneVoiceOneLyricsOne = \lyricmode {
  \set ignoreMelismata = ##t
  \set includeGraceNotes = ##t
  Wohl "mir," daß ich Je -- sum ha -- "be," o wie fe -- ste halt \skip1 \skip1
  ich \skip1 "ihn." das er mir mein Her -- ze la -- "be," wenn ich krank und
  trau -- \skip1 \skip1 rig \skip1 "bin." Je -- sum hab "ich," der \skip1 \skip1
  \skip1 mich lie -- bet und sich mir zu ei -- \skip1 \skip1 \skip1 gen gi --
  "bet;" "ach," drum laß ich Je -- sum "nicht," wenn mir gleich mein Her --
  \skip1 \skip1 ze "bricht." \skip1
}

PartPOneVoiceOneLyricsTwo = \lyricmode {
  \set ignoreMelismata = ##t
  \set includeGraceNotes = ##t
  Je -- sus blei -- bet mei -- ne Freu -- "de," mei -- nes Her -- zens Trost
  \skip1 \skip1 und \skip1 "Saft." Je -- sus weh -- ret al -- lem Lei -- "de,"
  er ist mei -- nes Le -- \skip1 \skip1 bens \skip1 "Kraft," mei -- ner Au --
  gen Lust \skip1 \skip1 \skip1 und Son -- ne mei -- ner See -- le Schatz \skip1
  \skip1 \skip1 und Won -- "ne;" da -- rum laß ich Je -- sum "nicht," aus dem
  Her -- zen und \skip1 \skip1 Ge -- "sicht." \skip1
}

PartPOneVoiceTwo = \relative g' {
  \clef "treble" \time 9/8 \key c \major s8*27 \break s8*9 \break s4*9 \repeat
  volta 2 {
    s8*9 \pageBreak s8*9 \bar "||" % 8
    \break \key g \major \D g2. \D g4. | % 9

    \barNumberCheck #10
    \D a4. ( \D g4. ) \D fis4. | % 10
    \D g4. \D d2. | % 11
    \D d4. \D d4. r4. \break | % 12
    r2. r4. | % 13
    \D g2. \D g4. | % 14
    \D g4. ( \D d4. ) \D e4. \pageBreak | % 15
    \D e4. \D fis8. ( [ \D e8. ] \D fis4. ) \break | % 16
    \D d2. r4. | % 17
    r2. r4. | % 18
    r2. r4. \break | % 19

    \barNumberCheck #20
    r2. r4. \pageBreak | % 20
    r2. r4. | % 21
    r2. r4. | % 22
    r2. r4. \break | % 23
    \D g2. \D g4. \break | % 24
    \D a4. ( \D g4. ) \D fis4. | % 25
    \D g4. \D d2. | % 26
    \D d4. \D d4. r4. s8*9 \pageBreak | % 28
    \D g2. \D g4. | % 29

    \barNumberCheck #30
    \D g4. ( \D d4. ) \D e4. | % 30
    \D e4. \D fis8. ( [ \D e8. ] \D fis4. ) \break | % 31
    \D d2. r4. \break | % 32
    r2. r4. | % 33
    r2. r4. | % 34
    r2. r4. \pageBreak | % 35
    r2. r4. \break | % 36
    r2. r4. | % 37
    r2. r4. | % 38
    r2. r4. \break | % 39

    \barNumberCheck #40
    \D fis2. \D gis4. \pageBreak | % 40
    \D a2. \D a4. | % 41
    \D a2. \D gis4. | % 42
    \D a4. \D a4. r4. \break | % 43
    r2. r4. \break | % 44
    r2. r4. | % 45
    \D a2. \D g4. | % 46
    \D g4. ( \D c4. ) \D g4. \pageBreak | % 47
    \D f4. ( \D a4. ) \D g4. \break | % 48
    \D g4. \D g4. r4. | % 49

    \barNumberCheck #50
    r2. r4. | % 50
    r2. r4. \break | % 51
    \D g2. \D g4. \pageBreak | % 52
    \D g2. \D g4. | % 53
    \D g8. [ \D fis8. ] \D g2. | % 54
    \D fis2. r4. \break | % 55
    r2. r4. \break | % 56
    \D g2. \D g4. | % 57
    \D g4. ( \D d4. ) \D e4. | % 58
    \D e4. \D fis8. ( [ \D e8. ] \D fis4. ) \pageBreak | % 59

    \barNumberCheck #60
    \D d2. ~ \D d4. \break | % 60
    r2. r4. | % 61
    r2. r4. | % 62
    r2. r4. \break | % 63
    r2. r4. \break | % 64
    r2. r4. | % 65
    r2. r4. | % 66
    r2. r4. \pageBreak | % 67
    r2. r4. | % 68
    r2. r4. }
  | % 69

  \barNumberCheck #70
  r2. r4. \break | % 70
  r2. r4. \bar "|."
}

PartPTwoVoiceOne = \relative d' {
  \clef "treble" \time 9/8 \key c \major s8*9 | % 1
  \oneVoice R8*9 | % 2
  R8*9 | % 3
  \break R8*9 | % 4
  \break R8*9 | % 5
  R8*9 | % 6
  \repeat volta 2 {
    R8*9 | % 7
    \pageBreak R8*9 \bar "||" % 8
    \break \key g \major \voiceOne \U d2. \U e4. | % 9

    \barNumberCheck #10
    \U a,2. \U b4. | % 10
    \U b4. ( \U a4. ) \U g4. | % 11
    \U fis4. \U a4. r4. \break | % 12
    r2. r4. | % 13
    \U d2. \U e4. | % 14
    \U d4. ( \U b4. ) \U b4. \pageBreak | % 15
    \U c8. [ \U a8. ] \U d8. ( [ \U b8. ] \U c4. ) \break | % 16
    \U b2. r4. | % 17
    r2. r4. | % 18
    r2. r4. \break | % 19

    \barNumberCheck #20
    r2. r4. \pageBreak | % 20
    r2. r4. | % 21
    r2. r4. | % 22
    r2. r4. \break | % 23
    \U d2. \U e4. \break | % 24
    \U a,2. \U b4. | % 25
    \U b4. ( \U a4. ) \U g4. | % 26
    \U fis4. \U a4. r4. | % 27
    \oneVoice R8*9 | % 28
    \pageBreak \voiceOne \U d2. \U e4. | % 29

    \barNumberCheck #30
    \U d4. ( \U b4. ) \U b4. | % 30
    \U c8. [ \U a8. ] \U d8. ( [ \U b8. ] \U c4. ) \break | % 31
    \U b2. r4. \break | % 32
    r2. r4. | % 33
    r2. r4. | % 34
    r2. r4. \pageBreak | % 35
    r2. r4. \break | % 36
    r2. r4. | % 37
    r2. r4. | % 38
    r2. r4. \break | % 39

    \barNumberCheck #40
    \U d2. \U d4. \pageBreak | % 40
    \U e2. \U f4. | % 41
    \U f4. ( \U d4. ) \U e4. | % 42
    \U c4. \U c4. r4. \break | % 43
    r2. r4. \break | % 44
    r2. r4. | % 45
    \U e2. \U d4. | % 46
    \U c2. \U c4. \pageBreak | % 47
    \U a2. \U b4. \break | % 48
    \U e4. \U e4. r4. | % 49

    \barNumberCheck #50
    r2. r4. | % 50
    r2. r4. \break | % 51
    \U d2. \U e4. \pageBreak | % 52
    \U d4. ( \U e4. ) \U b4. | % 53
    \U c4. ( \U d4. ) \U e4. | % 54
    \U a,2. r4. \break | % 55
    r2. r4. \break | % 56
    \U d2. \U e4. | % 57
    \U d4. ( \U b4. ) \U b4. | % 58
    \U c8. [ \U a8. ] \U d8. ( [ \U b8. ] \U c4. ) \pageBreak | % 59

    \barNumberCheck #60
    \U b2. ~ \U b4. \break | % 60
    r2. r4. | % 61
    r2. r4. | % 62
    r2. r4. \break | % 63
    r2. r4. \break | % 64
    r2. r4. | % 65
    r2. r4. | % 66
    r2. r4. \pageBreak | % 67
    r2. r4. | % 68
    r2. r4. }
  | % 69

  \barNumberCheck #70
  r2. r4. \break | % 70
  r2. r4. \bar "|."
}

PartPTwoVoiceTwo = \relative g {
  \clef "treble" \time 9/8 \key c \major s8*27 \break s8*9 \break s4*9 \repeat
  volta 2 {
    s8*9 \pageBreak s8*9 \bar "||" % 8
    \break \key g \major \D g4. ( \D fis4. ) \D e4. | % 9

    \barNumberCheck #10
    \D fis4. ( \D e4. ) \D d4. | % 10
    \D e4. ( \D fis4. ) \D g4. | % 11
    \D d4. \D d4. r4. \break | % 12
    r2. r4. | % 13
    \D g4. ( \D fis4. ) \D e4. | % 14
    \D b'4. ( \D b,4. ) \D e4. \pageBreak | % 15
    \D c4. \D d2. \break | % 16
    \D g,2. r4. | % 17
    r2. r4. | % 18
    r2. r4. \break | % 19

    \barNumberCheck #20
    r2. r4. \pageBreak | % 20
    r2. r4. | % 21
    r2. r4. | % 22
    r2. r4. \break | % 23
    \D g'4. ( \D fis4. ) \D e4. \break | % 24
    \D fis4. ( \D e4. ) \D d4. | % 25
    \D e4. ( \D fis4. ) \D g4. | % 26
    \D d4. \D d4. r4. s8*9 \pageBreak | % 28
    \D g4. ( \D fis4. ) \D e4. | % 29

    \barNumberCheck #30
    \D b'4. ( \D b,4. ) \D e4. | % 30
    \D c4. \D d4. \D d4. \break | % 31
    \D g,2. r4. \break | % 32
    r2. r4. | % 33
    r2. r4. | % 34
    r2. r4. \pageBreak | % 35
    r2. r4. \break | % 36
    r2. r4. | % 37
    r2. r4. | % 38
    r2. r4. \break | % 39

    \barNumberCheck #40
    \D d'4. ( \D c4. ) \D b4. \pageBreak | % 40
    \D a4. ( \D a'8. [ \D g8. ) ] \D f8. [ \D e8. ] | % 41
    \D d4. ( \D b4. ) \D e4. | % 42
    \D a,4. \D a4. r4. \break | % 43
    r2. r4. \break | % 44
    r2. r4. | % 45
    \D a'2. \D b4. | % 46
    \D c4. ( \D a4. ) \D e4. \pageBreak | % 47
    \D f4. ( \D d4. ) \D g4. \break | % 48
    \D c,4. \D c4. r4. | % 49

    \barNumberCheck #50
    r2. r4. | % 50
    r2. r4. \break | % 51
    \D g'2. \D e4. \pageBreak | % 52
    \D b'2. \D e,4. | % 53
    \D a,4. ( \D b4. ) \D c4. | % 54
    \D d2. r4. \break | % 55
    r2. r4. \break | % 56
    \D g4. ( \D fis4. ) \D e4. | % 57
    \D b'4. ( \D b,4. ) \D e4. | % 58
    \D c4. \D d2. \pageBreak | % 59

    \barNumberCheck #60
    \D g,2. ~ \D g4. \break | % 60
    r2. r4. | % 61
    r2. r4. | % 62
    r2. r4. \break | % 63
    r2. r4. \break | % 64
    r2. r4. | % 65
    r2. r4. | % 66
    r2. r4. \pageBreak | % 67
    r2. r4. | % 68
    r2. r4. }
  | % 69

  \barNumberCheck #70
  r2. r4. \break | % 70
  r2. r4. \bar "|."
}

PartPThreeVoiceOne = \relative g' {
  \clef "treble" \time 9/8 \key g \major r8 \U g8 [ \U a8 ] \U b8 [ \U d8 \U c8
  ] ^\markup \concat { \bold "J. S. Bach " \bold "arr. J. Knuth" } ^\markup
  \fontsize #5.906 "Jesu bleibet meine Freude" \U c8 [ ^\markup \concat {
    \fontsize #-0.562 \bold "Klavier " \fontsize #-0.562 \bold Orgel } \U e8 \U
  d8 ] | % 1
  \U d8 [ \U g8 \U fis8 ] \U g8 [ \U d8 \U b8 ] \U g8 [ \U a8 \U b8 ] | % 2
  \U c8 [ \U d8 \U e8 ] \U d8 [ \U c8 \U b8 ] \U a8 [ \U b8 ^\markup \fontsize
  #1.175 \bold "aus der Kantate 147" \U g8 ] \break | % 3
  \U fis8 [ \U g8 \U a8 ] \U d,8 [ \U fis8 \U a8 ] \U c8 [ \U b8 \U a8 ] \break
  | % 4
  \U b8 [ \U g8 \U a8 ] \U b8 [ \U d8 \U c8 ] \U c8 [ \U e8 \U d8 ] | % 5
  \U d8 [ \U g8 \U fis8 ] \U g8 [ \U d8 \U b8 ] \U g8 [ \U a8 \U b8 ] \repeat
  volta 2 {
    | % 6
    \U e,8 [ \U d'8 \U c8 ] \U b8 [ \U a8 \U g8 ] \U d8 [ \U g8 \U fis8 ]
    \pageBreak | % 7
    \oneVoice \D g8 [ \D b8 \D d8 ] \D g8 [ \D d8 \D b8 ] \D g8 [ \D b8 \D d8 ]
    \bar "||" % 8
    \break \voiceOne \U g2. \U c,4. | % 9

    \barNumberCheck #10
    \U d2. \U d4. | % 10
    \U c2. \U b4. | % 11
    \oneVoice \U a8 [ \U d,8 \U e8 ] \U fis8 [ \U a8 \U g8 ] \D a8 [ \D c8 \D b8
    ] \break | % 12
    \voiceOne \U c8 [ \U a8 \U fis8 ] \U d8 [ \U fis8 \U a8 ] \U c8 [ \U b8 \U a8
    ] | % 13
    \oneVoice \U b8 [ \U g8 \U a8 ] \D b8 [ \D d8 \D c8 ] \D c8 [ \D e8 \D d8 ]
    | % 14
    \D d8 [ \D g8 \D fis8 ] \D g8 [ \D d8 \D b8 ] \U g8 [ \U a8 \U b8 ]
    \pageBreak | % 15
    \U e,8 [ \U d'8 \U c8 ] \U b8 [ \U a8 \U g8 ] \U d8 [ \U g8 \U fis8 ] \break
    | % 16
    \voiceOne \U g8 [ \U b8 \U a8 ] \U b8 [ \U d8 \U c8 ] \U c8 [ \U e8 \U d8 ]
    | % 17
    \U d8 [ \U g8 \U fis8 ] \U g8 [ \U d8 \U b8 ] \U g8 [ \U a8 \U b8 ] | % 18
    \U c8 [ \U d8 \U e8 ] \U d8 [ \U c8 \U b8 ] \U a8 [ \U b8 \U g8 ] \break | % 19

    \barNumberCheck #20
    \U fis8 [ \U g8 \U a8 ] \U d,8 [ \U fis8 \U a8 ] \U c8 [ \U b8 \U a8 ]
    \pageBreak | % 20
    \U b8 [ \U g8 \U a8 ] \U b8 [ \U d8 \U c8 ] \U c8 [ \U e8 \U d8 ] | % 21
    \U d8 [ \U g8 \U fis8 ] \U g8 [ \U d8 \U b8 ] \U g8 [ \U a8 \U b8 ] | % 22
    \U e,8 [ \U d'8 \U c8 ] \U b8 [ \U a8 \U g8 ] \U d8 [ \U g8 \U fis8 ] \break
    | % 23
    r4. \U b4. \U c4. \break | % 24
    \U d2. \U d4. | % 25
    \U c2. \U b4. | % 26
    \oneVoice \U a8 [ \U d,8 \U e8 ] \U fis8 [ \U a8 \U g8 ] \D a8 [ \D c8 \D b8
    ] | % 27
    \voiceOne \U c8 [ \U a8 \U fis8 ] \U d8 [ \U fis8 \U a8 ] \U c8 [ \U b8 \U a8
    ] \pageBreak | % 28
    \oneVoice \U b8 [ \U g8 \U a8 ] \D b8 [ \D d8 \D c8 ] \D c8 [ \D e8 \D d8 ]
    | % 29

    \barNumberCheck #30
    \D d8 [ \D g8 \D fis8 ] \D g8 [ \D d8 \D b8 ] \U g8 [ \U a8 \U b8 ] | % 30
    \U e,8 [ \U d'8 \U c8 ] \U b8 [ \U a8 \U g8 ] \U d8 [ \U g8 \U fis8 ] \break
    | % 31
    \voiceOne \U g8 [ \U b8 \U a8 ] \U b8 [ \U d8 \U c8 ] \U c8 [ \U e8 \U d8 ]
    \break | % 32
    \U d8 [ \U g8 \U fis8 ] \U g8 [ \U d8 \U b8 ] \U g8 [ \U a8 \U b8 ] | % 33
    \U c8 [ \U d8 \U e8 ] \U d8 [ \U c8 \U b8 ] \U a8 [ \U b8 \U g8 ] | % 34
    \U fis8 [ \U g8 \U a8 ] \U d,8 [ \U fis8 \U a8 ] \U c8 [ \U b8 \U a8 ]
    \pageBreak | % 35
    \U b8 [ \U g8 \U a8 ] \U b8 [ \U d8 \U c8 ] \U c8 [ \U e8 \U d8 ] \break | % 36
    \U d8 [ \U g8 \U fis8 ] \U g8 [ \U d8 \U b8 ] \U g8 [ \U a8 \U b8 ] | % 37
    \U e,8 [ \U d'8 \U c8 ] \U b8 [ \U a8 \U g8 ] \U d8 [ \U g8 \U fis8 ] | % 38
    \oneVoice \D g8 [ \D b8 \D d8 ] \D g8 [ \D d8 \D b8 ] \U g8 [ \U b8 \U cis8
    ] \break | % 39

    \barNumberCheck #40
    \U d8 [ \U d,8 \U e8 ] \U fis8 [ \U a8 \U gis8 ] \U gis8 [ \U b8 \U a8 ]
    \pageBreak | % 40
    \D a8 [ \D c8 \D b8 ] \U c8 [ \U a8 \U e8 ] \U c8 [ \U d8 \U e8 ] | % 41
    \U f8 [ \U d'8 \U c8 ] \D d8 [ \D b8 \D gis8 ] \U e8 [ \U fis8 \U gis8 ] | % 42
    \D a8 [ \D c8 \D b8 ] \D c8 [ \D e8 \D d8 ] \D d8 [ \D f8 \D e8 ] \break | % 43
    \D e8 [ \D a8 \D gis8 ] \D a8 [ \D e8 \D c8 ] \D a8 [ \D b8 \D c8 ] \break | % 44
    \D f8 [ \D e8 \D d8 ] \D c8 [ \D b8 \D a8 ] \U e8 [ \U a8 \U gis8 ] | % 45
    \D a8 [ \D c8 \D e8 ] \D a8 r8 r8 r4. | % 46
    r8 \D c,8 [ \D d8 ] \D e8 [ \D g8 \D f8 ] \D g8 [ \D bes8 \D a8 ] \pageBreak
    | % 47
    \D a8 [ \D c8 \D b8 ] \D c8 [ \D a8 \D f8 ] \D d8 [ \D e8 \D f8 ] \break | % 48
    \D e8 [ \D g8 \D f8 ] \D g8 [ \D e8 \D c8 ] \U g8 [ \U a8 \U bes8 ] | % 49

    \barNumberCheck #50
    \D a8 [ \D c8 \D b8 ] \U c8 [ \U a8 \U f8 ] \U d8 [ \U e8 \U f8 ] | % 50
    \U e8 [ \U c8 \U d8 ] \U e8 [ \U g8 \U fis8 ] \U g8 [ \U b8 \U a8 ] \break | % 51
    \U b8 [ \U g8 \U a8 ] \D b8 [ \D d8 \D c8 ] \D c8 [ \D e8 \D d8 ] \pageBreak
    | % 52
    \D d8 [ \D g8 \D fis8 ] \D g8 [ \D d8 \D b8 ] \U g8 [ \U a8 \U b8 ] | % 53
    \D c8 [ \D d8 \D e8 ] \D d8 [ \D c8 \D b8 ] \U a8 [ \U b8 \U g8 ] | % 54
    \U fis8 [ \U d8 \U e8 ] \U fis8 [ \U a8 \U g8 ] \D a8 [ \D c8 \D b8 ] \break
    | % 55
    \voiceOne \U c8 [ \U a8 \U fis8 ] \U d8 [ \U fis8 \U a8 ] \U c8 [ \U b8 \U a8
    ] \break | % 56
    \oneVoice \U b8 [ \U g8 \U a8 ] \D b8 [ \D d8 \D c8 ] \D c8 [ \D e8 \D d8 ]
    | % 57
    \D d8 [ \D g8 \D fis8 ] \D g8 [ \D d8 \D b8 ] \U g8 [ \U a8 \U b8 ] | % 58
    \U e,8 [ \U d'8 \U c8 ] \U b8 [ \U a8 \U g8 ] \U d8 [ \U g8 \U fis8 ]
    \pageBreak | % 59

    \barNumberCheck #60
    \voiceOne \U g8 [ \U b8 \U d8 ] \U g8 [ \U d8 \U b8 ] \U g8 [ \U b8 \U d8 ]
    \break | % 60
    \U f8 [ \U d8 \U b8 ] \U g8 [ \U b8 \U d8 ] \U e8 [ \U c8 \U a8 ] | % 61
    \U fis8 [ \U a8 \U c8 ] \U d8 [ \U b8 \U g8 ] \U e8 [ \U g8 \U b8 ] | % 62
    \U c8 [ \U a8 \U fis8 ] \U d8 [ \U fis8 \U a8 ] \U c8 [ \U b8 \U a8 ] \break
    | % 63
    \U b8 [ \U g8 \U a8 ] \U b8 [ \U d8 \U c8 ] \U c8 [ \U e8 \U d8 ] \break | % 64
    \U d8 [ \U g8 \U fis8 ] \U g8 [ \U d8 \U b8 ] \U g8 [ \U a8 \U b8 ] | % 65
    \U c8 [ \U d8 \U e8 ] \U d8 [ \U c8 \U b8 ] \U a8 [ \U b8 \U g8 ] | % 66
    \U fis8 [ \U g8 \U a8 ] \U d,8 [ \U fis8 \U a8 ] \U c8 [ \U b8 \U a8 ]
    \pageBreak | % 67
    \U b8 [ \U g8 \U a8 ] \U b8 [ \U d8 \U c8 ] \U c8 [ \U e8 \U d8 ] | % 68
    \U d8 [ \U g8 \U fis8 ] \U g8 [ \U d8 \U b8 ] \U g8 [ \U a8 \U b8 ] }
  | % 69

  \barNumberCheck #70
  \U e,8 [ \U d'8 \U c8 ] \U b8 [ ^\markup \fontsize #1.175 \bold \italic "rit."
  \U a8 \U g8 ] \U d8 [ \U g8 \U fis8 ] \break | % 70
  \U g2. ~ \U g4. \bar "|."
}

PartPThreeVoiceTwo = \relative g' {
  \clef "treble" \time 9/8 \key g \major r8 \D g4 ~ \D g4. ~ \D g4. | % 1
  \D g4. ~ \D g4. ~ \D g4. ~ | % 2
  \D g4. ~ \D g4. \D e4. \break | % 3
  \D fis4. \D d4. ~ \D d4. \break | % 4
  r8 \D g4 ~ \D g4. ~ \D g4. | % 5
  \D g4. ~ \D g4. ~ \D g4. \repeat volta 2 {
    | % 6
    \D e4. ~ \D e4. \D d4. \pageBreak s8*9 \bar "||" % 8
    \break \D b'2. \D g4. | % 9

    \barNumberCheck #10
    \D a4. \D g4. \D fis4. | % 10
    \D g4. \D a4. \D g4. s8*9 \break | % 12
    \D c4. \D d,4. ~ \D d4 \D fis8 s4*9 \pageBreak s8*9 \break | % 16
    \D g4. ~ \D g2. | % 17
    \D g2. \D g4. | % 18
    \D g4. ~ \D g4. \D e4. \break | % 19

    \barNumberCheck #20
    \D fis4. \D d4. ~ \D d4. \pageBreak | % 20
    r8 \D g4 ~ \D g4. ~ \D g4. | % 21
    \D g4. ~ \D g4. ~ \D g4. | % 22
    \D e4. ~ \D e4. \D d4. \break | % 23
    \D g2. \D g4. \break | % 24
    \D a4. \D g4. \D fis4. | % 25
    \D g4. \D a4. \D g4. s8*9 | % 27
    \D c4. \D d,4. ~ \D d4 \D fis8 \pageBreak s8*27 \break | % 31
    \D g4. ~ \D g2. \break | % 32
    \D g2. \D g4. | % 33
    \D g4. ~ \D g4. \D e4. | % 34
    \D fis4. \D d4. ~ \D d4. \pageBreak | % 35
    r8 \D g4 ~ \D g4. ~ \D g4. \break | % 36
    \D g4. ~ \D g4. ~ \D g4. | % 37
    \D e4. ~ \D e4. \D d4. s8*9 \break s8*9 \pageBreak s8*27 \break s8*9 \break
    s8*27 \pageBreak s8*9 \break s8*27 \break s8*9 \pageBreak s8*27 \break | % 55
    \D c'4. \D d,4. ~ \D d4 \D fis8 \break s8*27 \pageBreak | % 59

    \barNumberCheck #60
    r4. r8 \D d'4 \D g,4. \break | % 60
    r8 \D d'4 \D g,4. r8 \D c4 | % 61
    \D fis,4. r8 \D b4 \D e,4. | % 62
    r8 \D a4 \D d,4. ~ \D d4 \D fis8 \break | % 63
    \D g4. ~ \D g2. \break | % 64
    \D g4. ~ \D g4. \D g4. ~ | % 65
    \D g2. \D e4. | % 66
    \D fis4. \D d2. \pageBreak | % 67
    r8 \D g4 ~ \D g2. | % 68
    \D g2. \D g4. }
  | % 69

  \barNumberCheck #70
  \D e2. \D d4 \D c8 \break | % 70
  \D b2. ~ \D b4. \bar "|."
}

PartPThreeVoiceFive = \relative g, {
  \clef "bass" \time 9/8 \key g \major \U g4. \D g'4. \D e4. | % 1
  \U b4. \D e4. \U e,4. | % 2
  \U a4. \U b4. \U c4. \break | % 3
  \D d4. \D fis4. \D d4. \break | % 4
  \D g4. \D e4. \U c4. | % 5
  \U b4. \D e4. \D d4. \repeat volta 2 {
    | % 6
    \U c4. \U cis4. \D d4. \pageBreak | % 7
    \U g,4. \D b'4 \D g8 \D d4 \U b8 \bar "||" % 8
    \break \U g4. \D fis'4. \D e4. | % 9

    \barNumberCheck #10
    \D fis4. \D e4. \D d4. | % 10
    \D e4. \D fis4. \D g4. | % 11
    \D d4. \D d4 \D d8 \D d4 \D d8 \break | % 12
    \U d,4. r4 \D d'8 \D d4 \D d8 | % 13
    \D g4. \D fis4. \D e4. | % 14
    \D b'4. \U b,4. \D e4. \pageBreak | % 15
    \U c4. \D d4. \U d,4. \break | % 16
    \U g4. \D g'4. \D e4. | % 17
    \U b4. \D e4. \U e,4. | % 18
    \U a4. \U b4. \U c4. \break | % 19

    \barNumberCheck #20
    \D d4. \D fis4. \D d4. \pageBreak | % 20
    \D g4. \D e4. \U c4. | % 21
    \U b4. \D e4. \D d4. | % 22
    \U c4. \U cis4. \D d4. \break | % 23
    \U g,4. \D fis'4. \D e4. \break | % 24
    \D fis4. \D e4. \D d4. | % 25
    \D e4. \D fis4. \D g4. | % 26
    \D d4. \D d4 \D d8 \D d4 \D d8 | % 27
    \U d,4. r4 \D d'8 \D d4 \D d8 \pageBreak | % 28
    \D g4. \D fis4. \D e4. | % 29

    \barNumberCheck #30
    \D b'4. \U b,4. \D e4. | % 30
    \U c4. \D d4. \U d,4. \break | % 31
    \U g4. \D g'4. \D e4. \break | % 32
    \U b4. \D e4. \U e,4. | % 33
    \U a4. \U b4. \U c4. | % 34
    \D d4. \D fis4. \D d4. \pageBreak | % 35
    \D g4. \D e4. \U c4. \break | % 36
    \U b4. \D e4. \D d4. | % 37
    \U c4. \U cis4. \D d4. | % 38
    \U g,4. \D b'4 \D g8 \D fis4 \D e8 \break | % 39

    \barNumberCheck #40
    \D d4. \U c4. \U b4. \pageBreak | % 40
    \U a4. \D a'8. [ \D g8. ] \D f8. [ \D e8. ] | % 41
    \D d4. \U b4. \D e4. | % 42
    \U a,4. \D a'4. \D d,4. \break | % 43
    \U c4. \D f4. \D e4. \break | % 44
    \D d4. \D dis4. \D e4. | % 45
    \U a,4. \D a'4. \D b4. | % 46
    \D c4. \D a4. \D e4. \pageBreak | % 47
    \D f4. \D d4. \D g4. \break | % 48
    \U c,4. \D c'4. \U c,4. | % 49

    \barNumberCheck #50
    \D f4. \D d4. \D g4. | % 50
    \U c,4. r4 \U c8 \U b4 \D d8 \break | % 51
    \U g,4. \D g'4. \D e4. \pageBreak | % 52
    \U b4. \D e4. \U e,4. | % 53
    \U a4. \U b4. \U c4. | % 54
    \D d4. \D d4 \D d8 \D d4 \D d8 \break | % 55
    \U d,4. r4 \D d'8 \D d4 \D d8 \break | % 56
    \D g4. \D fis4. \D e4. | % 57
    \D b'4. \U b,4. \D e4. | % 58
    \U c4. \D d4. \U d,4. \pageBreak | % 59

    \barNumberCheck #60
    \U g4. ~ \U g4. ~ \U g4. \break | % 60
    \U g4. ~ \U g4. ~ \U g4. ~ | % 61
    \U g4. ~ \U g4. ~ \U g4. ~ | % 62
    \U g4. ~ \U g4. ~ \U g4. \break | % 63
    \U g4. \D g'4. \D e4. \break | % 64
    \U b4. \D g'4. \D e4. | % 65
    \U a,4. \U b4. \U c4. | % 66
    \D d4. \D fis4. \D d4. \pageBreak | % 67
    \D g4. \D e4. \U c4. | % 68
    \U b4. \D e4. \D d4. }
  | % 69

  \barNumberCheck #70
  \U c4. \U cis4. \D d4. \break | % 70
  \U g,2. ~ \U g4. \bar "|."
}


% The score definition
\score {
  <<
    \new StaffGroup <<
      \new Staff = "P1" <<
        \set Staff.instrumentName = "Sopran (0,1)"
        \set Staff.shortInstrumentName = "S/A"
        \context Staff <<
          \mergeDifferentlyDottedOn
          \mergeDifferentlyHeadedOn
          \context Voice = "PartPOneVoiceOne" {
            \voiceOne \PartPOneVoiceOne
          }
          \new Lyrics \lyricsto "PartPOneVoiceOne" {
            \PartPOneVoiceOneLyricsOne
          }
          \new Lyrics \lyricsto "PartPOneVoiceOne" {
            \PartPOneVoiceOneLyricsTwo
          }
          \context Voice = "PartPOneVoiceTwo" {
            \voiceTwo \PartPOneVoiceTwo
          }
        >>
      >>
      \new Staff = "P2" <<
        \set Staff.instrumentName = "Bass (1,2)"
        \set Staff.shortInstrumentName = "T/B"
        \context Staff <<
          \override Staff.BarLine.allow-span-bar = ##f
          \mergeDifferentlyDottedOn
          \mergeDifferentlyHeadedOn
          \context Voice = "PartPTwoVoiceOne" {
            \voiceOne \PartPTwoVoiceOne
          }
          \context Voice = "PartPTwoVoiceTwo" {
            \voiceTwo \PartPTwoVoiceTwo
          }
        >>
      >>
    >>
    \new PianoStaff <<
      \set PianoStaff.instrumentName = "Klavier (2,4)"
      \context Staff = "1" <<
        \mergeDifferentlyDottedOn
        \mergeDifferentlyHeadedOn
        \context Voice = "PartPThreeVoiceOne" {
          \voiceOne \PartPThreeVoiceOne
        }
        \context Voice = "PartPThreeVoiceTwo" {
          \voiceTwo \PartPThreeVoiceTwo
        }
      >>
      \context Staff = "2" <<
        \override Staff.BarLine.allow-span-bar = ##f
        \mergeDifferentlyDottedOn
        \mergeDifferentlyHeadedOn
        \context Voice = "PartPThreeVoiceFive" {
          \PartPThreeVoiceFive
        }
      >>
    >>
  >>
  \layout {}
  \midi {}
}