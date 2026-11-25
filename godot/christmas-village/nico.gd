extends Control
const Art := preload("res://art.gd")
## Nico, l'elfo guida: ritratto disegnato in codice, con respiro, battito di ciglia,
## bocca che parla e saluto con la mano. Il clic su di lui emette `tapped`.

signal tapped

var talking := false
var happy := 0.0       # secondi di saluto rimasti
var t := 0.0

func _init() -> void:
	custom_minimum_size = Vector2(128, 172)
	mouse_filter = Control.MOUSE_FILTER_STOP
	mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND

func wave(sec := 2.0) -> void:
	happy = sec

func _process(d: float) -> void:
	t += d
	if happy > 0.0:
		happy -= d
	queue_redraw()

func _gui_input(e: InputEvent) -> void:
	if e is InputEventMouseButton and e.pressed and e.button_index == MOUSE_BUTTON_LEFT:
		tapped.emit()
		accept_event()

func _draw() -> void:
	var by := sin(t * 2.2) * 2.5
	var skin := Color("f6cfa8")
	var green := Color("2e8b57")
	var dgreen := Color("1f6b40")
	var red := Color("d1382c")
	var gold := Color("ffd24a")
	var cream := Color("f7f2ea")
	var hair := Color("c0542b")
	var ink := Color("7a2a2a")
	# ombra
	Art.ell(self, Vector2(64, 167), Vector2(36, 7), Color(0, 0, 0, 0.25))
	# gambe a righe e scarpe con campanella
	for side in 2:
		var lx := 44.0 + side * 30.0
		for k in 4:
			draw_rect(Rect2(lx, 142.0 + k * 5.0, 11.0, 5.0), red if k % 2 == 0 else cream)
		var dir := -1.0 if side == 0 else 1.0
		Art.ell(self, Vector2(lx + 5.0 + dir * 4.0, 164.0), Vector2(12.0, 5.5), dgreen)
		draw_circle(Vector2(lx + 5.0 + dir * 14.0, 161.0), 3.2, gold)
	# tunica
	draw_colored_polygon(PackedVector2Array([Vector2(38, 102 + by), Vector2(90, 102 + by), Vector2(100, 146 + by), Vector2(28, 146 + by)]), green)
	draw_colored_polygon(PackedVector2Array([Vector2(64, 102 + by), Vector2(90, 102 + by), Vector2(100, 146 + by), Vector2(64, 146 + by)]), Color(0, 0.1, 0.05, 0.18))
	draw_rect(Rect2(27, 142 + by, 74, 8), cream)
	draw_rect(Rect2(36, 118 + by, 56, 8), Color("4a2f1f"))
	draw_rect(Rect2(58, 117 + by, 12, 10), gold)
	draw_rect(Rect2(61, 120 + by, 6, 4), Color("4a2f1f"))
	draw_circle(Vector2(64, 108 + by), 2.4, gold)
	# braccia
	draw_line(Vector2(40, 108 + by), Vector2(26, 130 + by), green, 10.0)
	draw_circle(Vector2(25, 132 + by), 5.5, skin)
	var hand := Vector2(102, 132 + by)
	if happy > 0.0:
		hand = Vector2(106 + sin(t * 12.0) * 6.0, 86 + by)
	draw_line(Vector2(88, 108 + by), hand + Vector2(-2, 3), green, 10.0)
	draw_circle(hand, 5.5, skin)
	# orecchie a punta
	draw_colored_polygon(PackedVector2Array([Vector2(40, 66 + by), Vector2(12, 50 + by), Vector2(41, 84 + by)]), skin)
	draw_colored_polygon(PackedVector2Array([Vector2(88, 66 + by), Vector2(116, 50 + by), Vector2(87, 84 + by)]), skin)
	draw_colored_polygon(PackedVector2Array([Vector2(38, 68 + by), Vector2(21, 56 + by), Vector2(39, 80 + by)]), Color("f0a58a"))
	draw_colored_polygon(PackedVector2Array([Vector2(90, 68 + by), Vector2(107, 56 + by), Vector2(89, 80 + by)]), Color("f0a58a"))
	# testa e ciuffi
	draw_circle(Vector2(64, 74 + by), 27.0, skin)
	Art.ell(self, Vector2(45, 57 + by), Vector2(9, 6), hair)
	Art.ell(self, Vector2(83, 57 + by), Vector2(9, 6), hair)
	# cappello che si piega verso destra
	var pl := PackedVector2Array()
	var pr := PackedVector2Array()
	for i in 9:
		var f := i / 8.0
		var cx := 64.0 + 38.0 * f * f
		var cy := 54.0 - 46.0 * f + 14.0 * f * f
		var w := 26.0 * (1.0 - f) + 1.5
		pl.append(Vector2(cx - w, cy + by))
		pr.append(Vector2(cx + w, cy + by))
	for i in range(pr.size() - 1, -1, -1):
		pl.append(pr[i])
	draw_colored_polygon(pl, green)
	draw_colored_polygon(PackedVector2Array([Vector2(66, 20 + by), Vector2(84, 28 + by), Vector2(78, 40 + by), Vector2(62, 34 + by)]), Color(0, 0.1, 0.05, 0.15))
	Art.ell(self, Vector2(64, 55 + by), Vector2(31, 7), cream)
	draw_circle(Vector2(102, 22 + by), 6.0, gold)
	draw_circle(Vector2(100, 20 + by), 2.0, Color(1, 1, 0.8, 0.8))
	# viso
	var blink := fmod(t, 3.6) > 3.45
	for ex in [54.0, 74.0]:
		if blink:
			draw_line(Vector2(ex - 3.5, 76 + by), Vector2(ex + 3.5, 76 + by), Color.BLACK, 2.0)
		else:
			draw_circle(Vector2(ex, 76 + by), 3.4, Color.BLACK)
			draw_circle(Vector2(ex + 1.2, 74.8 + by), 1.2, Color.WHITE)
	draw_line(Vector2(48, 67 + by), Vector2(58, 65 + by), hair.darkened(0.3), 2.0)
	draw_line(Vector2(70, 65 + by), Vector2(80, 67 + by), hair.darkened(0.3), 2.0)
	draw_circle(Vector2(46, 85 + by), 5.0, Color(1, 0.5, 0.5, 0.35))
	draw_circle(Vector2(82, 85 + by), 5.0, Color(1, 0.5, 0.5, 0.35))
	draw_circle(Vector2(64, 82 + by), 3.0, Color("f0a58a"))
	if talking:
		Art.ell(self, Vector2(64, 91 + by), Vector2(5.5, 2.0 + 3.5 * absf(sin(t * 14.0))), ink)
	else:
		draw_arc(Vector2(64, 86 + by), 8.0, 0.3, PI - 0.3, 12, ink, 2.2)
