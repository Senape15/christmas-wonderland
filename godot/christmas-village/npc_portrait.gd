extends Control
const Art := preload("res://art.gd")
## Busto 2D di un personaggio (disegnato in codice a partire da `look`).

var look := {}
var talking := false
var t := 0.0

func _init() -> void:
	custom_minimum_size = Vector2(280, 380)
	mouse_filter = Control.MOUSE_FILTER_IGNORE

func _process(d: float) -> void:
	t += d
	queue_redraw()

func _draw() -> void:
	Art.bust(self, look, Vector2(140, 372), 1.25, t, talking)
