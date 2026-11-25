extends Node2D
## Cielo notturno: gradiente, stelle, stella cadente, luna con crateri, aurora a tende, nuvole e montagne innevate.

var stars := []
var shoot_t := -1.0
var next_shoot := 5.0
var shoot_from := Vector2(0.3, 0.12)

func _ready() -> void:
	var r := RandomNumberGenerator.new()
	r.seed = 7
	for i in 190:
		stars.append(Vector3(r.randf(), r.randf() * 0.62, r.randf() * TAU))

func _process(d: float) -> void:
	next_shoot -= d
	if next_shoot <= 0.0 and shoot_t < 0.0:
		shoot_t = 0.0
		shoot_from = Vector2(randf_range(0.1, 0.6), randf_range(0.04, 0.22))
		next_shoot = randf_range(7.0, 14.0)
	if shoot_t >= 0.0:
		shoot_t += d
		if shoot_t > 0.9:
			shoot_t = -1.0
	queue_redraw()

func _sky(f: float) -> Color:
	var a := Color("030818")
	var b := Color("0c2447")
	var c := Color("21607a")
	var e := Color("5aa0a0")
	if f < 0.45:
		return a.lerp(b, f / 0.45)
	if f < 0.78:
		return b.lerp(c, (f - 0.45) / 0.33)
	return c.lerp(e, (f - 0.78) / 0.22)

func _draw() -> void:
	var sz := get_viewport_rect().size
	var t := Time.get_ticks_msec() / 1000.0
	# gradiente a fasce
	var n := 40
	for i in n:
		var y0 := sz.y * i / float(n)
		draw_rect(Rect2(0, y0, sz.x, sz.y / float(n) + 1.0), _sky(float(i) / float(n - 1) * 0.9))
	# stelle
	for k in stars.size():
		var s: Vector3 = stars[k]
		var a := 0.45 + 0.55 * sin(t * 1.6 + s.z)
		var p := Vector2(s.x * sz.x, s.y * sz.y)
		draw_circle(p, 1.0 + 0.6 * a, Color(1, 1, 0.9, a))
		if k % 14 == 0:
			var l := 5.0 + 3.0 * a
			draw_line(p + Vector2(-l, 0), p + Vector2(l, 0), Color(1, 1, 0.9, a * 0.5), 1.0)
			draw_line(p + Vector2(0, -l), p + Vector2(0, l), Color(1, 1, 0.9, a * 0.5), 1.0)
	# stella cadente
	if shoot_t >= 0.0:
		var f := shoot_t / 0.9
		var head := Vector2(shoot_from.x * sz.x, shoot_from.y * sz.y) + Vector2(1, 0.45) * (f * sz.x * 0.35)
		var tail := head - Vector2(1, 0.45).normalized() * 110.0 * (1.0 - f * 0.4)
		draw_line(tail, head, Color(1, 1, 0.9, 1.0 - f), 2.5)
		draw_circle(head, 2.5, Color(1, 1, 1, 1.0 - f))
	# aurora a tende
	for k in 2:
		var col := Color(0.3, 1.0, 0.65) if k == 0 else Color(0.5, 0.6, 1.0)
		var cols := 36
		for i in cols:
			var x0 := sz.x * i / float(cols)
			var x1 := sz.x * (i + 1) / float(cols)
			var yb0 := sz.y * (0.30 + 0.04 * k) + sin(i * 0.45 + t * 0.35 + k * 2.0) * 26.0
			var yb1 := sz.y * (0.30 + 0.04 * k) + sin((i + 1) * 0.45 + t * 0.35 + k * 2.0) * 26.0
			var h0 := 70.0 + 55.0 * (0.5 + 0.5 * sin(i * 0.7 + t * 0.6 + k))
			var h1 := 70.0 + 55.0 * (0.5 + 0.5 * sin((i + 1) * 0.7 + t * 0.6 + k))
			draw_polygon(
				PackedVector2Array([Vector2(x0, yb0), Vector2(x1, yb1), Vector2(x1, yb1 - h1), Vector2(x0, yb0 - h0)]),
				PackedColorArray([Color(col, 0.16), Color(col, 0.16), Color(col, 0.0), Color(col, 0.0)]))
	# luna con crateri
	var m := Vector2(sz.x * 0.83, sz.y * 0.17)
	for g in 5:
		draw_circle(m, 34 + g * 22, Color(1, 0.97, 0.8, 0.045))
	draw_circle(m, 32, Color("fff6d6"))
	draw_circle(m + Vector2(-9, -6), 6.0, Color("efe3bd"))
	draw_circle(m + Vector2(8, 8), 4.5, Color("efe3bd"))
	draw_circle(m + Vector2(10, -11), 3.0, Color("efe3bd"))
	# nuvole lente
	for k in 3:
		var cx := fmod(sz.x * (0.2 + k * 0.35) + t * (6.0 + k * 3.0), sz.x + 400.0) - 200.0
		var cy := sz.y * (0.26 + 0.08 * k)
		for j in 5:
			draw_circle(Vector2(cx + j * 34 - 68, cy + sin(j * 1.7) * 6.0), 26.0 - absf(j - 2) * 5.0, Color(0.7, 0.85, 0.95, 0.06))
	# montagne con cime innevate
	var cnt := 14
	for layer in 3:
		var ridge := PackedVector2Array()
		for i in cnt:
			var hh := 0.10 + 0.07 * absf(sin(i * 1.7 + layer * 2.0)) + 0.04 * sin(i * 0.9 + layer)
			ridge.append(Vector2(sz.x * i / float(cnt - 1), sz.y * (0.68 - hh + layer * 0.06)))
		var poly := PackedVector2Array([Vector2(0, sz.y)])
		poly.append_array(ridge)
		poly.append(Vector2(sz.x, sz.y))
		var mc: Color = [Color("1a3b52"), Color("12303f"), Color("0b2230")][layer]
		draw_colored_polygon(poly, mc)
		if layer < 2:
			for i in range(1, cnt - 1):
				if ridge[i].y < ridge[i - 1].y and ridge[i].y < ridge[i + 1].y:
					var pk := ridge[i]
					draw_colored_polygon(
						PackedVector2Array([pk, pk.lerp(ridge[i - 1], 0.22) + Vector2(0, 14), pk.lerp(ridge[i + 1], 0.22) + Vector2(0, 14)]),
						Color(0.9, 0.96, 1.0, 0.75 - layer * 0.25))
	# bosco di abeti in lontananza
	var tl := PackedVector2Array([Vector2(0, sz.y)])
	for i in 60:
		var x := sz.x * i / 59.0
		var hgt := 16.0 + 14.0 * absf(sin(i * 2.3))
		tl.append(Vector2(x - sz.x / 118.0, sz.y * 0.78))
		tl.append(Vector2(x, sz.y * 0.78 - hgt))
	tl.append(Vector2(sz.x, sz.y * 0.78))
	tl.append(Vector2(sz.x, sz.y))
	draw_colored_polygon(tl, Color("081a26"))
