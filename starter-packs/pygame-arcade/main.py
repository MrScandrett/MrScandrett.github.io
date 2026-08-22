"""Catch Circuit — a guided Pygame arcade starter.

Comment labels:
WHAT describes a job. WHY explains a design decision. TRY THIS suggests a safe
experiment. CHECKPOINT describes observable evidence that the section works.
"""

import random
import pygame

# ------------------------------ SETUP ------------------------------
# WHAT: Pygame must initialize its display, input, font, and timing systems.
pygame.init()

WIDTH, HEIGHT = 800, 500
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Catch Circuit")
clock = pygame.time.Clock()
font = pygame.font.Font(None, 34)
small_font = pygame.font.Font(None, 24)

# WHY: Named colors make visual changes readable and consistent.
# TRY THIS: Create a new palette. Keep text/background contrast strong.
BACKGROUND = (10, 18, 34)
GRID = (22, 42, 68)
PLAYER_COLOR = (84, 230, 193)
SPARK_COLOR = (255, 210, 88)
TEXT_COLOR = (235, 245, 255)

PLAYER_SPEED = 420.0  # pixels per second
SPARK_SPEED = 190.0
TARGET_SCORE = 10

player = pygame.Rect(WIDTH // 2 - 55, HEIGHT - 55, 110, 22)
spark = pygame.Rect(0, 0, 24, 24)
score = 0
running = True
won = False


def reset_spark() -> None:
    """Place the spark above the arena at a new horizontal position."""
    spark.x = random.randint(0, WIDTH - spark.width)
    spark.y = -spark.height


def reset_game() -> None:
    """Restore all session state so R can restart without reopening Python."""
    global score, won
    score = 0
    won = False
    player.centerx = WIDTH // 2
    reset_spark()


reset_game()

# ---------------------------- GAME LOOP ----------------------------
while running:
    # WHAT: clock.tick caps the frame rate and reports elapsed milliseconds.
    # WHY: Multiplying movement by dt makes speed independent of frame rate.
    dt = min(clock.tick(60) / 1000.0, 0.05)

    # INPUT: Event input handles one-time actions such as close and restart.
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        elif event.type == pygame.KEYDOWN and event.key == pygame.K_r:
            reset_game()

    # INPUT: Held-key input is checked every frame for continuous movement.
    keys = pygame.key.get_pressed()
    direction = 0
    if keys[pygame.K_LEFT] or keys[pygame.K_a]:
        direction -= 1
    if keys[pygame.K_RIGHT] or keys[pygame.K_d]:
        direction += 1

    # UPDATE: All changing game state belongs together before drawing.
    if not won:
        player.x += round(direction * PLAYER_SPEED * dt)
        player.clamp_ip(screen.get_rect())
        spark.y += round(SPARK_SPEED * dt)

        # COLLISION: Rect.colliderect performs AABB edge comparisons.
        if player.colliderect(spark):
            score += 1
            reset_spark()
            if score >= TARGET_SCORE:
                won = True
        elif spark.top > HEIGHT:
            reset_spark()

    # RENDER: Clear, draw world, draw actors, then draw interface.
    screen.fill(BACKGROUND)
    for x in range(0, WIDTH, 40):
        pygame.draw.line(screen, GRID, (x, 0), (x, HEIGHT))
    for y in range(0, HEIGHT, 40):
        pygame.draw.line(screen, GRID, (0, y), (WIDTH, y))

    pygame.draw.rect(screen, PLAYER_COLOR, player, border_radius=8)
    pygame.draw.rect(screen, SPARK_COLOR, spark, border_radius=12)
    screen.blit(font.render(f"Score {score} / {TARGET_SCORE}", True, TEXT_COLOR), (18, 16))
    screen.blit(small_font.render("Move: A/D or arrows   Restart: R", True, TEXT_COLOR), (18, 52))

    if won:
        message = font.render("CIRCUIT CHARGED! Press R to replay.", True, PLAYER_COLOR)
        screen.blit(message, message.get_rect(center=(WIDTH // 2, HEIGHT // 2)))

    # CHECKPOINT: Without display.flip, the finished frame never reaches the window.
    pygame.display.flip()

pygame.quit()
