%% Dumps every musical event LilyPond engraves, one tab-separated line each, to <output>.events
%% Injected with -dinclude-settings=dump.ly so the source files are not touched.
%% Columns: kind  bar  measurePos  moment  grace  staff  voice  ...kind-specific fields

#(define dump-port #f)
%% Old Mutopia sources call auto-beam helpers that LilyPond 2.24 removed; they only affect beaming.
#(define-public (revert-auto-beam-setting . args) (make-music 'SequentialMusic 'elements '()))
#(define-public (override-auto-beam-setting . args) (make-music 'SequentialMusic 'elements '()))
#(define (dump-out) (or dump-port (begin (set! dump-port (open-file (string-append (ly:parser-output-name) ".events") "w")) dump-port)))
#(define ctx-ids (make-hash-table))
#(define ctx-next 0)
#(define (ctx-id ctx)
   (if (not ctx) "-"
       (let ((v (hashq-ref ctx-ids ctx)))
         (if v v (begin (set! ctx-next (1+ ctx-next))
                        (hashq-set! ctx-ids ctx (format #f "~a~a" (ly:context-name ctx) ctx-next))
                        (hashq-ref ctx-ids ctx))))))
#(define (mom->str m) (format #f "~a/~a" (ly:moment-main-numerator m) (ly:moment-main-denominator m)))
#(define (grace->str m) (format #f "~a/~a" (ly:moment-grace-numerator m) (ly:moment-grace-denominator m)))
#(define (where ctx)
   (let* ((score (ly:context-find ctx 'Score))
          (bar (ly:context-property score 'currentBarNumber))
          (pos (ly:context-property score 'measurePosition))
          (now (ly:context-current-moment ctx)))
     (list bar (mom->str pos) (mom->str now) (grace->str now)
           (ctx-id (ly:context-find ctx 'Staff)) (ctx-id (ly:context-find ctx 'Voice)))))
#(define (emit ctx kind . fields)
   (let ((p (dump-out)))
     (display (string-join (map (lambda (x) (format #f "~a" x)) (append (list kind) (where ctx) fields)) "\t") p)
     (newline p)))
#(define (dur->str d)
   (if (ly:duration? d)
       (format #f "~a\t~a\t~a" (ly:duration-log d) (ly:duration-dot-count d) (ly:duration-scale d))
       "x\tx\tx"))
#(define (pitch->str p)
   (format #f "~a\t~a\t~a" (ly:pitch-notename p) (ly:pitch-alteration p) (ly:pitch-octave p)))
#(define (art-list ev)
   (let ((arts (ly:event-property ev 'articulations '())))
     (string-join
      (filter (lambda (s) (string? s))
              (map (lambda (a)
                     (cond ((memq 'tie-event (ly:event-property a 'class)) "tie")
                           ((memq 'tremolo-event (ly:event-property a 'class))
                            (format #f "trem~a" (ly:event-property a 'tremolo-type 16)))
                           ((ly:event-property a 'articulation-type #f) => (lambda (t) (format #f "~a" t)))
                           (else #f)))
                   arts))
      ",")))

#(define (dump-voice context)
   (make-engraver
    (listeners
     ((note-event engraver ev)
      (let* ((ctx (ly:translator-context engraver)) (p0 (ly:event-property ev 'pitch))
             (tr (ly:context-property ctx 'instrumentTransposition))
             ;; Transposing instruments (\\transposition) are reported at sounding (concert) pitch.
             (p (if (and (ly:pitch? p0) (ly:pitch? tr)) (ly:pitch-transpose p0 tr) p0)))
        (if (ly:pitch? p)
            (emit ctx "note" (pitch->str p) (dur->str (ly:event-property ev 'duration)) (art-list ev)))))
     ((rest-event engraver ev)
      (emit (ly:translator-context engraver) "rest" (dur->str (ly:event-property ev 'duration))
            (if (ly:pitch? (ly:event-property ev 'pitch #f)) "pitched" "")))
     ((skip-event engraver ev)
      (emit (ly:translator-context engraver) "skip" (dur->str (ly:event-property ev 'duration))))
     ((multi-measure-rest-event engraver ev)
      (emit (ly:translator-context engraver) "mmrest" (dur->str (ly:event-property ev 'duration))))
     ((tie-event engraver ev) (emit (ly:translator-context engraver) "tie"))
     ((tremolo-event engraver ev) (emit (ly:translator-context engraver) "trem" (ly:event-property ev 'tremolo-type 16)))
     ((articulation-event engraver ev)
      (emit (ly:translator-context engraver) "art" (ly:event-property ev 'articulation-type)))
     ((absolute-dynamic-event engraver ev)
      (emit (ly:translator-context engraver) "dyn" (ly:event-property ev 'text)))
     ((tuplet-span-event engraver ev)
      (emit (ly:translator-context engraver) "tuplet" (ly:event-property ev 'span-direction)
            (ly:event-property ev 'numerator 0) (ly:event-property ev 'denominator 0))))))

#(define (dump-staff context)
   (let ((last-clef #f) (last-key #f))
     (make-engraver
      ((process-music engraver)
       (let* ((ctx (ly:translator-context engraver))
              (clef (format #f "~a ~a ~a" (ly:context-property ctx 'clefGlyph) (ly:context-property ctx 'clefPosition) (ly:context-property ctx 'clefTransposition)))
              (key (format #f "~a" (ly:context-property ctx 'keyAlterations))))
         (if (not (equal? clef last-clef)) (begin (set! last-clef clef) (emit ctx "clef" clef)))
         (if (not (equal? key last-key)) (begin (set! last-key key) (emit ctx "key" key))))))))

#(define (dump-score context)
   (let ((last-time #f))
     (make-engraver
      (listeners
       ((volta-span-event engraver ev)
        (emit (ly:translator-context engraver) "volta" (ly:event-property ev 'span-direction)
              (format #f "~a" (ly:event-property ev 'volta-numbers '()))))
       ((volta-repeat-start-event engraver ev)
        (emit (ly:translator-context engraver) "repeat" "(start-repeat)"))
       ((volta-repeat-end-event engraver ev)
        (emit (ly:translator-context engraver) "repeat" "(end-repeat)")))
      ((process-music engraver)
       (let* ((ctx (ly:translator-context engraver))
              (rc (ly:context-property ctx 'repeatCommands '()))
              (ts (ly:context-property ctx 'timeSignatureFraction)))
         (if (pair? rc) (emit ctx "repeat" (format #f "~s" rc)))
         (if (not (equal? ts last-time)) (begin (set! last-time ts) (emit ctx "time" (format #f "~a/~a" (car ts) (cdr ts))))))))))

\layout {
  \context { \Voice \consists #dump-voice }
  \context { \Staff \consists #dump-staff }
  \context { \Score \consists #dump-score }
}
