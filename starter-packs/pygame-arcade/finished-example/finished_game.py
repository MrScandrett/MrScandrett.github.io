"""Reference extension: Catch Circuit with lives, rising difficulty, and restart.

Try the challenges yourself before consulting this file. The key idea is to add
state variables and change one existing update rule rather than duplicate the game.
Search for "NEW:" to find every section that differs from main.py.

Run it from the pack folder with:  python finished-example/finished_game.py
"""

import random
import pygame

pygame.init()

WIDTH, HEIGHT = 800, 500
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Catch Circuit — Finished Example")
clock = pygame.time.Clock()
font = pygame.font.Font(None, 34)
small_font = pygame.font.Font(None, 24)

BACKGROUND = (10, 18, 34)
GRID = (22, 42, 68)
PLAYER_COLOR = (84, 230, 193)
SPARK_COLOR = (255, 210, 88)
TEXT_COLOR = (235, 245, 255)
DANGER_COLOR = (255, 85, 122)

PLAYER_SPEED = 420.0
BASE_SPARK_SPEED = 190.0
SPEED_PER_CATCH = 14.0  # NEW: each catch makes the next spark a little faster
MAX_SPARK_SPEED = 430.0  # NEW: capped near PLAYER_SPEED so every spark stays catchable
START_LIVES = 3          # NEW

player = pygame.Rect(WIDTH // 2 - 55, HEIGHT - 55, 110, 22)
spark = pygame.Rect(0, 0, 24, 24)
score = 0
lives = START_LIVES
best = 0                 # NEW: highest score this session
game_over = False        # NEW: freezes the update step until R is pressed
running = True


def reset_spark() -> None:
    spark.x = random.randint(0, WIDTH - spark.width)
    spark.y = -spark.height


def reset_game() -> None:
    global score, lives, game_over
    score = 0
    lives = START_LIVES
    game_over = False
    player.centerx = WIDTH // 2
    reset_spark()


def spark_speed() -> float:
    # NEW: Difficulty is a function of score, so it resets automatically with it.
    return min(BASE_SPARK_SPEED + score * SPEED_PER_CATCH, MAX_SPARK_SPEED)


reset_game()

while running:
    dt = min(clock.tick(60) / 1000.0, 0.05)

    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        elif event.type == pygame.KEYDOWN and event.key == pygame.K_r:
            reset_game()

    keys = pygame.key.get_pressed()
    direction = int(keys[pygame.K_RIGHT] or keys[pygame.K_d]) - int(keys[pygame.K_LEFT] or keys[pygame.K_a])

    # NEW: Nothing moves after game over. Without this guard, sparks keep falling
    # and lives count below zero.
    if not game_over:
        player.x += round(direction * PLAYER_SPEED * dt)
        player.clamp_ip(screen.get_rect())
        spark.y += round(spark_speed() * dt)

        if player.colliderect(spark):
            score += 1
            best = max(best, score)
            reset_spark()
        elif spark.top > HEIGHT:
            # NEW: A missed spark costs a life instead of being ignored.
            lives -= 1
            reset_spark()
            if lives <= 0:
                game_over = True

    screen.fill(BACKGROUND)
    for x in range(0, WIDTH, 40):
        pygame.draw.line(screen, GRID, (x, 0), (x, HEIGHT))
    for y in range(0, HEIGHT, 40):
        pygame.draw.line(screen, GRID, (0, y), (WIDTH, y))

    pygame.draw.rect(screen, PLAYER_COLOR, player, border_radius=8)
    if not game_over:
        pygame.draw.rect(screen, SPARK_COLOR, spark, border_radius=12)

    hud = f"Score {score}   Lives {lives}   Best {best}"
    screen.blit(font.render(hud, True, TEXT_COLOR), (18, 16))
    screen.blit(small_font.render(f"Spark speed {spark_speed():.0f} px/s   Move: A/D or arrows   Restart: R",
                                  True, TEXT_COLOR), (18, 52))

    if game_over:
        message = font.render(f"GAME OVER — score {score}. Press R to play again.", True, DANGER_COLOR)
        screen.blit(message, message.get_rect(center=(WIDTH // 2, HEIGHT // 2)))

    pygame.display.flip()

pygame.quit()
