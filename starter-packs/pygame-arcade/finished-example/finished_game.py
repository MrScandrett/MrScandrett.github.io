"""Reference extension: Catch Circuit with lives and rising difficulty.

Try the challenges yourself before consulting this file. The key idea is to add
state variables and change one existing update rule rather than duplicate the game.
"""

import random
import pygame

pygame.init()
WIDTH, HEIGHT = 800, 500
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Catch Circuit — Finished Example")
clock = pygame.time.Clock()
font = pygame.font.Font(None, 34)

player = pygame.Rect(WIDTH // 2 - 55, HEIGHT - 55, 110, 22)
spark = pygame.Rect(0, -24, 24, 24)
score, lives = 0, 3
running = True


def respawn() -> None:
    spark.x = random.randint(0, WIDTH - spark.width)
    spark.y = -spark.height


while running:
    dt = min(clock.tick(60) / 1000, 0.05)
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False

    keys = pygame.key.get_pressed()
    direction = int(keys[pygame.K_RIGHT] or keys[pygame.K_d]) - int(keys[pygame.K_LEFT] or keys[pygame.K_a])
    player.x += round(direction * 420 * dt)
    player.clamp_ip(screen.get_rect())

    # The fall speed rises with score but stays readable.
    spark.y += round((190 + score * 14) * dt)
    if player.colliderect(spark):
        score += 1
        respawn()
    elif spark.top > HEIGHT:
        lives -= 1
        respawn()

    screen.fill((10, 18, 34))
    pygame.draw.rect(screen, (84, 230, 193), player, border_radius=8)
    pygame.draw.rect(screen, (255, 210, 88), spark, border_radius=12)
    screen.blit(font.render(f"Score {score}   Lives {lives}", True, (235, 245, 255)), (18, 18))
    if lives <= 0:
        screen.blit(font.render("Game over — close and run again", True, (255, 85, 122)), (210, 240))
    pygame.display.flip()

pygame.quit()
