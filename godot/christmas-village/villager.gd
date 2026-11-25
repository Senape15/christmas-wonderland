extends Node2D
const Art := preload("res://art.gd")
## Abitante che passeggia avanti e indietro lungo un sentiero (route in unità griglia).

var m
var look := {}
var route := PackedVector2Array()
var offset := 0.25         # spostamento laterale, così non camminano tutti sulla stessa riga
var t_route := 0.0         # 0..1 lungo il percorso
var dir := 1.0
var speed := 0.05
var pause := 0.0
var walking := true
var moving_left := false
var phase := 0.0

func _ready() -> void:
	phase = randf() * 10.0
	position = _place(t_route)

func _place(f: float) -> Vector2:
	var n := route.size() - 1
	var x := clampf(f, 0.0, 1.0) * n
	var i := mini(int(x), n - 1)
	var a := route[i]
	var b := route[i + 1]
	var g := a.lerp(b, x - i)
	var nrm := (b - a).normalized().orthogonal()
	return m.iso(g + nrm * offset)

func _process(d: float) -> void:
	phase += d
	if pause > 0.0:
		pause -= d
		walking = false
		queue_redraw()
		return
	walking = true
	t_route += dir * speed * d
	if t_route >= 1.0:
		t_route = 1.0
		dir = -1.0
		pause = randf_range(2.0, 6.0)
	elif t_route <= 0.0:
		t_route = 0.0
		dir = 1.0
		pause = randf_range(2.0, 6.0)
	var np := _place(t_route)
	if absf(np.x - position.x) > 0.01:
		moving_left = np.x < position.x
	position = np
	queue_redraw()

func _draw() -> void:
	Art.person(self, look, phase, walking, moving_left)
