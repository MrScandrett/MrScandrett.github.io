
\version "2.9.13"

\paper {
between-system-padding = #0.1
between-system-space = #0.1
ragged-last-bottom = ##f
ragged-bottom = ##f
}
upper = \relative c'' {
\clef treble
\key a \minor
\time 3/4
\override Score.MetronomeMark #'padding = #2.5
\tempo 4=60
r8 e\( fis d e fis
b4 g d~
d e g,\)
<d fis b>2( <cis f c'!>4
%5
<g! c! e>4. <dis' g>8 <c e>4)
\voiceOne
<<
{
b'4.\( d8 d? c
}
\context Voice="1" { \voiceTwo

<d, fis>2 <dis fis>4
\oneVoice
}
>>
\oneVoice
<c e>4 <g' b>4. <c, e>8
<g b e>2. 
%8
a4\) r r
r8 e'''~\( <e, e'> <d d'> <e~ e'~>4
<e e'> <d d'>8 <b b'> <a a'> <b b'>
<e e'>4 <d d'>8 <g, g'> <b~ b'~>4
<b b'> <a a'>8 <g g'> <e e'> <g g'>
<b b'> <d! d'!> <b b'>4. <a a'>8
<b b'> <e, e'> <g g'>4.\) <g g'>8\(
% au movt
<g aes c! g'>2\arpeggio f'4
<dis, a'!>4. <d c'!>8 <dis a'>4\)
<g aes c! g'>4.\( \arpeggio f'8 g[ c,]
<dis, a'!>4. <d c'!>8 <dis a'>4\)
<bes d a'>\( \arpeggio g' f 
a4. f8[ d bes]
d2\) \slurUp d4- - ( \(
\clef bass
\voiceOne
<<
{ d4) c4. b8}
\context Voice="1" { \voiceTwo
<fis gis>4 <e gis> <d fis> 
\oneVoice
}
>>
\oneVoice
<c e b'>2.\)
r4 r \clef treble r8 e''\(
fis d e fis b4~
b\fermata \) r4 r
\bar "||"

}
lower = \relative c {
\clef bass
\key a \minor
\time 3/4
R2. 
r8 a( e' g c e
\clef treble
g c) r4 r
\clef bass
r8 e,,,( e' fis gis4)
%5
r8 a,( e' b' g4)
r8 e,( e' fis gis4)
r8 a,( e' b' g4)
r8 d,\( a' d e fis~
%8
fis \clef  treble d' e fis a d\)
<f! a>2 <g b>4 
<f a>2 <d f>8 <e g>
<f a>2 <fis dis>4
<c! e>2\( <ais cis>4
<c! e>8 <dis fis>4 <e g>8 <c~ e~>4
<c e>8 <b dis>4 <bes d>8 <a cis>4\)
%au movt
r8 f,([ c' g'] aes4)
\clef bass
r8 cis,,[ eis b'~] b4
\clef treble
r8 f( c' f g aes)
\clef bass
r b,,[ fis' a~] a4
r8 g,( d'! f! bes d 
\clef treble
r <bes'~ d~> <bes d>4) r
R2.
\clef bass
e,,,2.
r8 a,\( e' b' c e
\clef treble
b' c e b' c4
b c8 d <c~ e~>4
<c e c' e\fermata > \) 
r r

}



dynamics = {
s8 s8\p s2
s2.
s
s
s
s16\< s s8 s\! s s
s2.
s4 s2\>
s2 s8 s16 s16\! s s8
%10
s2.\pp
s4 s\< s8 s8\!
s2\> s4\!
s4 s2\<
s4\! s4 s
s8 s8\> s4 s\!
s2.\p


s
s
s
s8\< s s2
s2.
s8\! s8 s4 s\>
s2.
s2.
s2 s8\! s\pp
s2.
s
}

pedal = {
s2.
s8 s8\sustainDown 
}
\score {
\new PianoStaff <<
\new Staff = "upper" \upper
\new Dynamics = "dynamics" \dynamics
\new Staff = "lower" <<
\clef bass
\lower
>>
\new Dynamics = "pedal" \pedal
>>
\layout {
\context {
\type "Engraver_group"
\name Dynamics
\alias Voice % So that \cresc works, for example.
\consists "Output_property_engraver"
\override VerticalAxisGroup #'minimum-Y-extent = #'(-1 . 1)
pedalSustainStrings = #'("Ped." "*Ped." "*")
pedalUnaCordaStrings = #'("una corda" "" "tre corde")
\consists "Piano_pedal_engraver"
\consists "Script_engraver"
\consists "Dynamic_engraver"
\consists "Text_engraver"
\override TextScript #'font-size = #2
\override TextScript #'font-shape = #'italic
\override DynamicText #'extra-offset = #'(0 . 2.5)
\override Hairpin #'extra-offset = #'(0 . 2.5)
\consists "Skip_event_swallow_translator"
\consists "Axis_group_engraver"
}
\context {
\PianoStaff
\accepts Dynamics

}
}
}
\score {
\new PianoStaff <<
\new Staff = "upper" << \upper \dynamics >>
\new Staff = "lower" << \lower \dynamics >>
\new Dynamics = "pedal" \pedal
>>
\midi {
\context {
\type "Performer_group"
\name Dynamics
\consists "Piano_pedal_performer"
}
\context {
\PianoStaff
\accepts Dynamics
}
}
}
\header {
title = "Prélude"
composer = "Maurice Ravel"
tagline = " "
}