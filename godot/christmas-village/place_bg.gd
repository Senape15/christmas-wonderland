extends Control
## Sfondo provvisorio di un luogo (interno con finestre e ghirlanda).
## Viene sostituito da res://backgrounds/<kind>.png (o zone_<quartiere>.png) appena il file esiste.

var zone := ""
var kind := ""

const PAL := {
	"piazza-centrale": [Color("0c2447"), Color("2a6b8a"), Color("dbe9f2")],
	"ufficio-postale": [Color("4a2326"), Color("a8473a"), Color("6b4a3a")],
	"pasticceria": [Color("c99a5a"), Color("f6e3b8"), Color("a4553a")],
	"negozio-giocattoli": [Color("4a3578"), Color("9a7fc0"), Color("d9c1ee")],
	"laboratorio-babbo-natale": [Color("22402d"), Color("6f8a6a"), Color("6b4a2a")],
	"lago-ghiacciato": [Color("163f4a"), Color("9fd3e8"), Color("e6f3f9")],
	"default": [Color("1a3b52"), Color("4a7a8a"), Color("c9d6dc")]}

func _process(_d: float) -> void:
	if visible:
		queue_redraw()

func _draw() -> void:
	var s := size
	var pal: Array = PAL.get(zone, PAL["default"])
	var top: Color = pal[0]
	var bot: Color = pal[1]
	var flr: Color = pal[2]
	var t := Time.get_ticks_msec() / 1000.0
	var hz := s.y * 0.62
	for i in 30:
		draw_rect(Rect2(0, hz * i / 30.0, s.x, hz / 30.0 + 1.0), top.lerp(bot, i / 29.0))
	draw_rect(Rect2(0, hz, s.x, s.y - hz), flr)
	draw_rect(Rect2(0, hz, s.x, 8), flr.darkened(0.3))
	for i in range(-8, 9):
		draw_line(Vector2(s.x * 0.5 + i * s.x * 0.035, hz), Vector2(s.x * 0.5 + i * s.x * 0.15, s.y), flr.darkened(0.12), 2.0)
	for k in 3:
		var cx := s.x * (0.2 + 0.3 * k)
		var w := s.x * 0.12
		var y0 := hz - s.y * 0.40
		var wc := Color(1, 0.85, 0.5, 0.9)
		draw_rect(Rect2(cx - w / 2, y0, w, s.y * 0.32), wc)
		draw_circle(Vector2(cx, y0), w / 2, wc)
		var fr := Color(0.25, 0.16, 0.1)
		draw_arc(Vector2(cx, y0), w / 2, PI, TAU, 24, fr, 5.0)
		draw_line(Vector2(cx - w / 2, y0), Vector2(cx - w / 2, y0 + s.y * 0.32), fr, 5.0)
		draw_line(Vector2(cx + w / 2, y0), Vector2(cx + w / 2, y0 + s.y * 0.32), fr, 5.0)
		draw_line(Vector2(cx, y0 - w / 2), Vector2(cx, y0 + s.y * 0.32), fr, 4.0)
		draw_line(Vector2(cx - w / 2, y0 + s.y * 0.14), Vector2(cx + w / 2, y0 + s.y * 0.14), fr, 4.0)
	var cols := [Color("ff5a5a"), Color("ffd24a"), Color("5ab4ff"), Color("7dff9a")]
	var prev := Vector2(0, 24)
	for i in 41:
		var p := Vector2(s.x * i / 40.0, 24.0 + sin(i / 40.0 * PI * 4.0) * 16.0 + 14.0)
		if i > 0:
			draw_line(prev, p, Color(0.1, 0.1, 0.12), 2.0)
		var a := 0.55 + 0.45 * sin(t * 3.0 + i)
		draw_circle(p + Vector2(0, 6), 8.0, Color(cols[i % 4], a * 0.22))
		draw_circle(p + Vector2(0, 6), 3.2, Color(cols[i % 4], a))
		prev = p
	draw_string(ThemeDB.fallback_font, Vector2(16, s.y - 10), "Sfondo provvisorio - aggiungi res://backgrounds/%s.png" % kind, HORIZONTAL_ALIGNMENT_LEFT, -1, 13, Color(1, 1, 1, 0.4))
