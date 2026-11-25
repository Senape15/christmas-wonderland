extends Node2D

const U := Vector2(80, 40)
const HouseScript := preload("res://house.gd")
const PropScript := preload("res://prop.gd")
const SkyScript := preload("res://sky.gd")
const FxScript := preload("res://fx.gd")
const NicoScript := preload("res://nico.gd")
const LabelScript := preload("res://zone_label.gd")
const VillagerScript := preload("res://villager.gd")
const PlaceScript := preload("res://place_scene.gd")
const NpcData := preload("res://npcs.gd")

const S := 6.5           # scala mappa % -> unità griglia
const ZONE_R := 2.7      # raggio di un quartiere (unità griglia) per il clic sul terreno
const BUILDINGS := {"ufficio-postale": "postoffice", "pasticceria": "bakery",
	"negozio-giocattoli": "toyshop", "laboratorio-babbo-natale": "workshop"}
const ZONE_TINT := {"ufficio-postale": Color(0.55, 0.65, 0.85, 0.35), "pasticceria": Color(0.95, 0.8, 0.55, 0.35),
	"negozio-giocattoli": Color(0.7, 0.55, 0.9, 0.3), "laboratorio-babbo-natale": Color(0.5, 0.75, 0.55, 0.35),
	"lago-ghiacciato": Color(0.55, 0.78, 0.95, 0.3)}
const ZONE_BLURB := {
	"piazza-centrale": "Siamo nel cuore del villaggio: il grande albero, la fontana e la scatola finale.",
	"ufficio-postale": "Qui arrivano tutte le letterine per Babbo Natale!",
	"pasticceria": "Senti che profumo? Biscotti appena sfornati!",
	"negozio-giocattoli": "Giocattoli di ogni tipo, c'è perfino un trenino che fischia.",
	"laboratorio-babbo-natale": "Il laboratorio segreto di Babbo Natale: gli elfi lavorano giorno e notte!",
	"lago-ghiacciato": "Il lago è ghiacciato, ma il ponte è sicuro. Ci scivoli un po'?"}

var rng := RandomNumberGenerator.new()
var rng2 := RandomNumberGenerator.new()   # solo per decorazioni: non tocca la disposizione degli alberi
var houses: Array = []
var props: Array = []
var spots: Array[Vector2] = []
var deco_pts: Array[Vector2] = []
var patches: Array = []
var glints: Array = []   # [posizione, fase]
var paths: Array = []      # sentieri (punti in unità griglia)
var villagers: Array = []
var place               # scena del luogo (dialogo con il personaggio)
var cam: Camera2D
var cam_tw: Tween
var world: Node2D
var labels_root: Node2D
var labels := {}         # slug -> cartello del quartiere
var zones := {}          # slug -> {name, g}
var zone_stats := {}     # slug -> {total, done, open}
var dragging := false
var drag_dist := 0.0
var view := "village"    # "village" | "district"
var focus_zone := ""
var hover_zone := ""
var target = null        # luogo che Nico consiglia
var intro_done := false
var shot_zone := ""
var final_box: Node2D
var final_lit := false
var vig := 0.0
var vignette_mat: ShaderMaterial

# interfaccia
var ui_theme: Theme
var popup: PanelContainer
var popup_title: Label
var popup_body: Label
var popup_btn: Button
var open_day := 0
var header: PanelContainer
var header_title: Label
var header_sub: Label
var back_btn: Button
var nico
var nico_box: HBoxContainer
var bubble: PanelContainer
var nico_text: Label
var nico_name_lbl: Label
var nico_actions: HBoxContainer
var nico_tw: Tween
var bubble_gen := 0
## Frasi configurate lato server (quiz e contenuti sbloccati), chiave = kind del luogo.
var dialogues := {}
## Fattore di ingrandimento dell'interfaccia su schermi stretti (telefono).
var ui_k := 1.0
var loader: CanvasLayer
var loader_box: PanelContainer
var loader_spin: Control
var loader_t := 0.0
var ui_check_t := 0.0

func _ready() -> void:
	var fx = FxScript.new()          # sopra al terreno, sotto agli oggetti
	add_child(fx)
	world = Node2D.new()
	world.y_sort_enabled = true
	add_child(world)
	labels_root = Node2D.new()
	add_child(labels_root)
	rng.seed = 2026
	rng2.seed = 99
	var sky_layer := CanvasLayer.new()
	sky_layer.layer = -10
	sky_layer.add_child(SkyScript.new())
	add_child(sky_layer)
	cam = Camera2D.new()
	cam.position = Vector2(0, 20)
	cam.zoom = Vector2(0.55, 0.55)
	add_child(cam)
	if not "--shot" in OS.get_cmdline_user_args():
		cam_tw = create_tween()
		cam_tw.tween_property(cam, "zoom", Vector2(0.85, 0.85), 1.6).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	_snow(220, 55.0, 95.0, 1.6, 3.2, 0.6)
	_snow(70, 110.0, 160.0, 4.0, 7.0, 0.9)
	_build_ui()
	_build_loader()
	for i in 40:
		var a := rng.randf() * TAU
		var p := Vector2(cos(a), sin(a)) * sqrt(rng.randf()) * 7.4
		var rx := rng.randf_range(30.0, 90.0)
		patches.append([iso(p), Vector2(rx, rx * 0.45),
			Color(1, 1, 1, 0.55) if i % 2 == 0 else Color(0.55, 0.72, 0.88, 0.22)])
	for i in 150:
		var a2 := rng2.randf() * TAU
		var gp := Vector2(cos(a2), sin(a2)) * sqrt(rng2.randf()) * 7.2
		glints.append([iso(gp), rng2.randf() * TAU])
	Api.village_loaded.connect(_on_village_loaded)
	Api.request_failed.connect(func(m):
		_hide_loader()
		_show("Ops", m, 0))
	_setup_js_back()
	Api.fetch_village()
	_maybe_screenshot()

func _maybe_screenshot() -> void:
	var args := OS.get_cmdline_user_args()
	if not "--shot" in args:
		return
	for a in args:
		if a.begins_with("--zoom="):
			cam.zoom = Vector2.ONE * float(a.substr(7))
		if a.begins_with("--at="):
			var v := a.substr(5).split(",")
			cam.position = Vector2(float(v[0]), float(v[1]))
		if a.begins_with("--zone="):
			shot_zone = a.substr(7)
	if shot_zone != "":
		await get_tree().create_timer(0.5).timeout
		_focus_zone(shot_zone)
	await get_tree().create_timer(3.0).timeout
	get_viewport().get_texture().get_image().save_png("/tmp/shot.png")
	get_tree().quit()

# ---------------------------------------------------------------- geometria

func iso(p: Vector2) -> Vector2:
	return Vector2((p.x - p.y) * U.x, (p.x + p.y) * U.y)

func _blob(r: float, wob: float, off: float) -> PackedVector2Array:
	var pts := PackedVector2Array()
	for i in 96:
		var a := TAU * i / 96.0
		var rr := r + sin(a * 3.0 + off) * wob + sin(a * 5.0 + off * 2.0) * wob * 0.5
		var cx := cos(a)
		var sy := sin(a)
		pts.append(iso(Vector2(signf(cx) * sqrt(absf(cx)), signf(sy) * sqrt(absf(sy))) * rr))
	return pts

func _disc(g: Vector2, r: float, col: Color) -> void:
	var pts := PackedVector2Array()
	for i in 40:
		pts.append(iso(g + Vector2(cos(TAU * i / 40.0), sin(TAU * i / 40.0)) * r))
	draw_colored_polygon(pts, col)

func _circle_iso(g: Vector2, r: float) -> PackedVector2Array:
	var pts := PackedVector2Array()
	for i in 49:
		var a := TAU * i / 48.0
		pts.append(iso(g + Vector2(cos(a), sin(a)) * r))
	return pts

func _ell(c: Vector2, r: Vector2, col: Color) -> void:
	var pts := PackedVector2Array()
	for i in 36:
		pts.append(c + Vector2(cos(TAU * i / 36.0) * r.x, sin(TAU * i / 36.0) * r.y))
	draw_colored_polygon(pts, col)

## Punto sulla mappa (unità griglia) sotto a un punto del mondo.
func _to_grid(p: Vector2) -> Vector2:
	return Vector2(p.x / U.x + p.y / U.y, p.y / U.y - p.x / U.x) * 0.5

func _path_bend(slug: String) -> float:
	return 0.6 if slug.length() % 2 == 0 else -0.6

## Sentiero curvo (curva di Bézier) dalla piazza a un quartiere, in unità griglia.
func _path_pts(a: Vector2, b: Vector2, bend: float) -> PackedVector2Array:
	var pts := PackedVector2Array()
	var d := b - a
	var c := (a + b) * 0.5 + Vector2(-d.y, d.x).normalized() * bend
	for i in 17:
		var t := i / 16.0
		pts.append(a * (1.0 - t) * (1.0 - t) + c * 2.0 * (1.0 - t) * t + b * t * t)
	return pts

# ---------------------------------------------------------------- disegno terreno

func _draw() -> void:
	# alone azzurrino sotto l'isola
	for k in 4:
		_ell(Vector2(0, 80), Vector2(1020.0 - k * 80.0, 580.0 - k * 50.0), Color(0.35, 0.8, 0.85, 0.05))
	var base := _blob(8.0, 0.3, 1.0)
	for d in range(52, 0, -4):
		var off := PackedVector2Array()
		for v in base:
			off.append(v + Vector2(0, d))
		draw_colored_polygon(off, Color("9ab9cc").darkened(d / 110.0))
	draw_colored_polygon(base, Color("dbe9f2"))
	draw_colored_polygon(_blob(7.2, 0.3, 1.0), Color("e8f2f8"))
	draw_colored_polygon(_blob(5.0, 0.4, 3.0), Color("f2f8fb"))
	# piastrelle a scacchiera, come in un gestionale: danno profondità e misura
	for ix in range(-8, 8):
		for iy in range(-8, 8):
			var cc := Vector2(ix + 0.5, iy + 0.5)
			if pow(absf(cc.x) / 7.7, 4.0) + pow(absf(cc.y) / 7.7, 4.0) > 1.0:
				continue
			if posmod(ix + iy, 2) == 0:
				draw_colored_polygon(PackedVector2Array([iso(Vector2(ix, iy)), iso(Vector2(ix + 1, iy)), iso(Vector2(ix + 1, iy + 1)), iso(Vector2(ix, iy + 1))]), Color(0.55, 0.72, 0.9, 0.12))
	for p in patches:
		_ell(p[0], p[1], p[2])
	# sentieri dalla piazza ai quartieri
	if zones.has("piazza-centrale"):
		var pg0: Vector2 = zones["piazza-centrale"]["g"]
		for slug in zones:
			if slug == "piazza-centrale":
				continue
			var zg0: Vector2 = zones[slug]["g"]
			var ip := PackedVector2Array()
			for q in _path_pts(pg0, zg0, _path_bend(str(slug))):
				ip.append(iso(q))
			draw_polyline(ip, Color(0.62, 0.72, 0.8, 0.8), 40.0, true)
			draw_polyline(ip, Color(0.86, 0.92, 0.96), 32.0, true)
			draw_polyline(ip, Color(1, 1, 1, 0.55), 16.0, true)
	for slug in ZONE_TINT:
		if zones.has(slug):
			var tc: Color = ZONE_TINT[slug]
			var zg: Vector2 = zones[slug]["g"]
			var ptop := Color("eef4f8").lerp(Color(tc, 1.0), 0.45)
			_plate(zg, 2.35, 0.7, ptop, ptop.darkened(0.3), 10)
			draw_polyline(square_pts(zg, 2.2, 0.62) + PackedVector2Array([square_pts(zg, 2.2, 0.62)[0]]), Color(1, 1, 1, 0.55), 2.0, true)
	if zones.has("piazza-centrale"):
		var pg: Vector2 = zones["piazza-centrale"]["g"]
		_plate(pg, 2.8, 1.1, Color("d3dde5"), Color("8fa3b3"), 12)
		_disc(pg, 2.5, Color("dfe8ee"))
		_disc(pg, 1.0, Color("e6edf2"))
		for rr in [1.7, 2.2, 2.55]:
			draw_polyline(_circle_iso(pg, rr), Color(0.55, 0.62, 0.7, 0.35), 2.0, true)
		for i in 10:
			var dir := Vector2(cos(i * TAU / 10.0), sin(i * TAU / 10.0))
			draw_line(iso(pg + dir * 1.1), iso(pg + dir * 2.5), Color(0.55, 0.62, 0.7, 0.28), 1.5)
	if zones.has("lago-ghiacciato"):
		var lg: Vector2 = zones["lago-ghiacciato"]["g"] + Vector2(0, 0.15)
		_disc(lg, 1.75, Color("f4f9fc"))
		_disc(lg, 1.5, Color("9fd3e8"))
		_disc(lg + Vector2(-0.2, -0.2), 1.0, Color("b6e3f3"))
		for i in 4:
			var a := 0.7 + i * 1.5
			draw_line(iso(lg + Vector2(cos(a), sin(a)) * 0.3), iso(lg + Vector2(cos(a + 0.4), sin(a + 0.4)) * 1.3), Color(1, 1, 1, 0.45), 2.0)
		for i in 18:
			var sa := i * TAU / 18.0
			_ell(iso(lg + Vector2(cos(sa), sin(sa)) * 1.78), Vector2(15, 6), Color(0.96, 0.98, 1.0, 0.95))
	draw_polyline(base + PackedVector2Array([base[0]]), Color(1, 1, 1, 0.5), 3.0)

## Quadrato con gli angoli tagliati (ottagono) in unità griglia, già in coordinate schermo.
func square_pts(g: Vector2, half: float, cut: float) -> PackedVector2Array:
	var h := half
	var raw: Array[Vector2] = [Vector2(-h + cut, -h), Vector2(h - cut, -h), Vector2(h, -h + cut), Vector2(h, h - cut),
		Vector2(h - cut, h), Vector2(-h + cut, h), Vector2(-h, h - cut), Vector2(-h, -h + cut)]
	var pts := PackedVector2Array()
	for q in raw:
		pts.append(iso(g + q))
	return pts

## Piattaforma rialzata ("lotto") con spessore: ogni quartiere sta sul suo lotto.
func _plate(g: Vector2, half: float, cut: float, top: Color, side: Color, thick: int) -> void:
	var tp := square_pts(g, half, cut)
	for d in range(thick, 0, -2):
		var off := PackedVector2Array()
		for v in tp:
			off.append(v + Vector2(0, d))
		draw_colored_polygon(off, side.darkened(float(d) / 70.0))
	draw_colored_polygon(tp, top)

func _snow(amount: int, vmin: float, vmax: float, smin: float, smax: float, alpha: float) -> void:
	var layer := CanvasLayer.new()
	layer.layer = 1
	add_child(layer)
	var w := get_viewport_rect().size.x
	var s := CPUParticles2D.new()
	s.position = Vector2(w / 2.0, -10)
	s.amount = amount
	s.lifetime = 9.0
	s.preprocess = 9.0
	s.emission_shape = CPUParticles2D.EMISSION_SHAPE_RECTANGLE
	s.emission_rect_extents = Vector2(w / 2.0 + 60, 5)
	s.direction = Vector2(0.15, 1)
	s.spread = 12.0
	s.gravity = Vector2.ZERO
	s.initial_velocity_min = vmin
	s.initial_velocity_max = vmax
	s.scale_amount_min = smin
	s.scale_amount_max = smax
	s.color = Color(1, 1, 1, alpha)
	layer.add_child(s)

# ---------------------------------------------------------------- interfaccia

func _btn_style(bg: Color) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = bg
	s.set_corner_radius_all(12)
	s.border_color = bg.lightened(0.35)
	s.set_border_width_all(2)
	s.content_margin_left = 16.0
	s.content_margin_right = 16.0
	s.content_margin_top = 8.0
	s.content_margin_bottom = 8.0
	return s

func _make_theme() -> Theme:
	var th := Theme.new()
	th.set_stylebox("normal", "Button", _btn_style(Color("2e7d4f")))
	th.set_stylebox("hover", "Button", _btn_style(Color("3a9a62")))
	th.set_stylebox("pressed", "Button", _btn_style(Color("1f5f3a")))
	th.set_stylebox("focus", "Button", StyleBoxEmpty.new())
	th.set_color("font_color", "Button", Color.WHITE)
	th.set_color("font_hover_color", "Button", Color.WHITE)
	th.set_color("font_pressed_color", "Button", Color.WHITE)
	th.set_font_size("font_size", "Button", 18)
	th.set_font_size("font_size", "Label", 18)
	return th

## Su un telefono verticale il viewport 1280x720 viene scalato a ~0.34:
## i controlli in pixel sarebbero minuscoli. Questo fattore li riporta a
## dimensioni leggibili senza toccare la scala della mappa.
func ui_scale() -> float:
	var v := Vector2(1280, 720)
	if OS.has_feature("web"):
		# get_viewport().size resta 1280x720 con stretch "canvas_items":
		# nel browser dobbiamo legere le dimensioni reali della canvas.
		var w := float(JavaScriptBridge.eval("window.innerWidth"))
		var h := float(JavaScriptBridge.eval("window.innerHeight"))
		if w > 0.0 and h > 0.0:
			v = Vector2(w, h)
	else:
		v = get_viewport().size
	if v.x <= 0.0 or v.y <= 0.0:
		return 1.0
	var s := minf(v.x / 1280.0, v.y / 720.0)
	if s <= 0.0:
		return 1.0
	return clampf(1.0 / s, 1.0, 3.2)

## I Container di Godot azzerano lo scale dei figli: ingrandiamo Nico
## direttamente nel disegno e i font del dialogo, senza scalare i contenitori.
func _apply_ui_scale() -> void:
	var k := ui_scale()
	if absf(k - ui_k) < 0.01:
		return
	ui_k = k
	if nico != null:
		nico.render_scale = k
		nico.custom_minimum_size = Vector2(128 * k, 172 * k)
		nico.queue_redraw()
	if nico_name_lbl != null:
		nico_name_lbl.add_theme_font_size_override("font_size", int(round(15 * k)))
	if nico_text != null:
		nico_text.add_theme_font_size_override("font_size", int(round(19 * k)))
		nico_text.custom_minimum_size = Vector2(240 * k, 0)
	if nico_actions != null:
		nico_actions.add_theme_constant_override("separation", int(round(8 * k)))
	if header_title != null:
		header_title.add_theme_font_size_override("font_size", int(round(18 * k)))
	if header_sub != null:
		header_sub.add_theme_font_size_override("font_size", int(round(14 * k)))
	if nico_box != null:
		nico_box.offset_left = 14.0 * k
		nico_box.offset_right = 14.0 * k
		nico_box.offset_top = -14.0 * k
		nico_box.offset_bottom = -14.0 * k
		nico_box.add_theme_constant_override("separation", int(round(6 * k)))

## Copre il villaggio finché i dati non arrivano: niente paesaggio vuoto.
func _build_loader() -> void:
	loader = CanvasLayer.new()
	loader.layer = 20
	add_child(loader)
	var shade := ColorRect.new()
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	shade.color = Color("041f12")
	shade.mouse_filter = Control.MOUSE_FILTER_STOP
	loader.add_child(shade)
	loader_box = PanelContainer.new()
	loader_box.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	loader_box.custom_minimum_size = Vector2(300, 150)
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.06, 0.20, 0.13, 0.96)
	sb.border_color = Color("e6b84a")
	sb.set_border_width_all(2)
	sb.set_corner_radius_all(24)
	sb.set_content_margin_all(22)
	loader_box.add_theme_stylebox_override("panel", sb)
	loader.add_child(loader_box)
	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 10)
	loader_box.add_child(vbox)
	var title := Label.new()
	title.text = "Christmas Wonderland"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 22)
	title.add_theme_color_override("font_color", Color("ffd966"))
	vbox.add_child(title)
	var sub := Label.new()
	sub.text = "Sto accendendo le luci del villaggio…"
	sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	sub.add_theme_font_size_override("font_size", 15)
	sub.add_theme_color_override("font_color", Color("b8d6c4"))
	vbox.add_child(sub)
	loader_spin = Control.new()
	loader_spin.custom_minimum_size = Vector2(28, 28)
	loader_spin.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	loader_spin.draw.connect(_draw_loader_spin)
	vbox.add_child(loader_spin)

func _draw_loader_spin() -> void:
	if loader_spin == null:
		return
	var c := loader_spin.get_rect().get_center()
	var r := 11.0
	for i in 8:
		var a := TAU * float(i) / 8.0 - loader_t * 4.0
		var alpha := 0.25 + 0.75 * float(i) / 8.0
		loader_spin.draw_circle(c + Vector2(cos(a), sin(a)) * r, 3.5, Color(0.95, 0.78, 0.32, alpha))

func _process_loader(d: float) -> void:
	if loader != null and loader.visible:
		loader_t += d
		loader_spin.queue_redraw()

func _hide_loader() -> void:
	if loader == null or not loader.visible:
		return
	var current := loader
	var panel := loader_box
	if panel != null:
		create_tween().tween_property(panel, "modulate:a", 0.0, 0.45).set_ease(Tween.EASE_OUT)
	await get_tree().create_timer(0.48).timeout
	current.queue_free()
	loader = null
	if OS.has_feature("web"):
		# Il messaggio deve andare alla pagina padre, non all'iframe stessa.
		JavaScriptBridge.eval("window.parent.postMessage({type:'wonderland:ready'}, window.location.origin)")

## La pagina può chiedere il ritorno al villaggio con un messaggio.
func _setup_js_back() -> void:
	if not OS.has_feature("web"):
		return
	var cb := JavaScriptBridge.create_callback(_on_js_back)
	JavaScriptBridge.eval("window.addEventListener('message', function(e){ if(e.origin===window.location.origin && e.data && e.data.type==='wonderland:back'){ %s(e.data); } });" % cb)

func _on_js_back(_args: Array) -> void:
	_back_to_village()

func _post_view(view_name: String) -> void:
	if OS.has_feature("web"):
		JavaScriptBridge.eval("window.parent.postMessage({type:'wonderland:view',view:'%s'}, window.location.origin)" % view_name)

func _build_ui() -> void:
	ui_k = ui_scale()
	ui_theme = _make_theme()
	# vignettatura: scurisce i bordi quando si guarda un quartiere da vicino
	var vl := CanvasLayer.new()
	vl.layer = 1
	add_child(vl)
	var vr := ColorRect.new()
	vr.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	vr.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var sh := Shader.new()
	sh.code = "shader_type canvas_item;\nuniform float strength = 0.0;\nvoid fragment() {\n\tvec2 uv = UV - vec2(0.5);\n\tfloat d = dot(uv, uv) * 2.0;\n\tCOLOR = vec4(0.02, 0.05, 0.14, smoothstep(0.12, 0.8, d) * strength);\n}\n"
	vignette_mat = ShaderMaterial.new()
	vignette_mat.shader = sh
	vignette_mat.set_shader_parameter("strength", 0.0)
	vr.material = vignette_mat
	vl.add_child(vr)

	var layer := CanvasLayer.new()
	layer.layer = 2
	add_child(layer)
	var root := Control.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.theme = ui_theme
	layer.add_child(root)

	# finestra "Apri la sorpresa"
	popup = PanelContainer.new()
	popup.custom_minimum_size = Vector2(420, 0)
	popup.visible = false
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color("0f3b25")
	sb.border_color = Color("e6b84a")
	sb.set_border_width_all(3)
	sb.set_corner_radius_all(18)
	sb.set_content_margin_all(22)
	popup.add_theme_stylebox_override("panel", sb)
	root.add_child(popup)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 12)
	popup.add_child(box)
	popup_title = Label.new()
	popup_title.add_theme_font_size_override("font_size", 28)
	popup_title.add_theme_color_override("font_color", Color("ffd966"))
	popup_body = Label.new()
	popup_body.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	popup_body.custom_minimum_size = Vector2(376, 0)
	popup_body.add_theme_color_override("font_color", Color("f1f7f2"))
	popup_btn = Button.new()
	popup_btn.text = "Apri la sorpresa"
	popup_btn.pressed.connect(_on_open_pressed)
	var close := Button.new()
	close.text = "Chiudi"
	close.pressed.connect(func(): popup.visible = false)
	for n in [popup_title, popup_body, popup_btn, close]:
		box.add_child(n)

	# barra in alto: nome del quartiere + torna al villaggio
	header = PanelContainer.new()
	header.anchor_left = 0.5
	header.anchor_right = 0.5
	header.anchor_top = 0.0
	header.anchor_bottom = 0.0
	header.offset_top = 12.0
	header.offset_bottom = 12.0
	header.grow_horizontal = Control.GROW_DIRECTION_BOTH
	var hs := StyleBoxFlat.new()
	hs.bg_color = Color(0.04, 0.17, 0.11, 0.88)
	hs.border_color = Color("e6b84a")
	hs.set_border_width_all(2)
	hs.set_corner_radius_all(16)
	hs.set_content_margin_all(12)
	header.add_theme_stylebox_override("panel", hs)
	root.add_child(header)
	var hb := HBoxContainer.new()
	hb.add_theme_constant_override("separation", 14)
	header.add_child(hb)
	back_btn = Button.new()
	back_btn.text = "Torna al villaggio"
	back_btn.pressed.connect(_back_to_village)
	back_btn.visible = false
	header_title = Label.new()
	header_title.text = "Villaggio di Natale"
	header_title.add_theme_font_size_override("font_size", int(round(18 * ui_k)))
	header_title.add_theme_color_override("font_color", Color("ffd966"))
	header_sub = Label.new()
	header_sub.add_theme_font_size_override("font_size", int(round(14 * ui_k)))
	header_sub.add_theme_color_override("font_color", Color("b8d6c4"))
	header_sub.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	hb.add_child(back_btn)
	hb.add_child(header_title)
	hb.add_child(header_sub)

	# Nico + nuvoletta
	nico_box = HBoxContainer.new()
	nico_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	nico_box.anchor_left = 0.0
	nico_box.anchor_right = 0.0
	nico_box.anchor_top = 1.0
	nico_box.anchor_bottom = 1.0
	nico_box.offset_left = 14.0 * ui_k
	nico_box.offset_right = 14.0 * ui_k
	nico_box.offset_top = -14.0 * ui_k
	nico_box.offset_bottom = -14.0 * ui_k
	nico_box.grow_horizontal = Control.GROW_DIRECTION_END
	nico_box.grow_vertical = Control.GROW_DIRECTION_BEGIN
	nico_box.add_theme_constant_override("separation", int(round(6 * ui_k)))
	root.add_child(nico_box)
	nico = NicoScript.new()
	nico.tapped.connect(_on_nico_tapped)
	# Il ritratto si ingrandisce nel disegno (i Container azzerano lo scale).
	nico.render_scale = ui_k
	nico.custom_minimum_size = Vector2(128 * ui_k, 172 * ui_k)
	nico_box.add_child(nico)
	bubble = PanelContainer.new()
	bubble.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	bubble.visible = false
	var bs := StyleBoxFlat.new()
	bs.bg_color = Color("fff3d6")
	bs.border_color = Color("c0392b")
	bs.set_border_width_all(3)
	bs.set_corner_radius_all(18)
	bs.set_content_margin_all(16)
	bs.shadow_color = Color(0, 0, 0, 0.35)
	bs.shadow_size = 8
	bubble.add_theme_stylebox_override("panel", bs)
	nico_box.add_child(bubble)
	var bb := VBoxContainer.new()
	bb.add_theme_constant_override("separation", 8)
	bubble.add_child(bb)
	nico_name_lbl = Label.new()
	nico_name_lbl.text = "Nico, l'elfo guida"
	nico_name_lbl.add_theme_font_size_override("font_size", int(round(15 * ui_k)))
	nico_name_lbl.add_theme_color_override("font_color", Color("c0392b"))
	nico_text = Label.new()
	nico_text.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	# La nuvoletta viene già scalata come contenitore: non scalare anche
	# i font qui, altrimenti il testo raddoppia e finisce fuori schermo.
	nico_text.custom_minimum_size = Vector2(240 * ui_k, 0)
	nico_text.add_theme_font_size_override("font_size", int(round(19 * ui_k)))
	nico_text.add_theme_color_override("font_color", Color("3a2418"))
	nico_actions = HBoxContainer.new()
	nico_actions.add_theme_constant_override("separation", int(round(8 * ui_k)))
	bb.add_child(nico_name_lbl)
	bb.add_child(nico_text)
	bb.add_child(nico_actions)

	# scena del luogo: sopra a tutto
	var sl := CanvasLayer.new()
	sl.layer = 5
	add_child(sl)
	place = PlaceScript.new()
	place.theme = ui_theme
	place.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	place.finished.connect(_on_place_finished)
	place.closed.connect(_on_place_closed)
	sl.add_child(place)

# ---------------------------------------------------------------- Nico

## Nico parla. `actions` = [{"label": "Testo", "call": Callable}, ...] (bottoni sotto al testo).
## Lo useremo anche per i quiz: domanda nel testo, risposte come bottoni.
func _nico_say(text: String, actions: Array = [], do_wave := true) -> void:
	bubble_gen += 1
	var gen := bubble_gen
	nico_text.text = text
	for c in nico_actions.get_children():
		c.queue_free()
	for a in actions:
		var b := Button.new()
		b.text = str(a["label"])
		b.pressed.connect(a["call"])
		nico_actions.add_child(b)
	bubble.visible = true
	nico_text.visible_ratio = 0.0
	if nico_tw != null and nico_tw.is_valid():
		nico_tw.kill()
	nico.talking = true
	if do_wave:
		nico.wave(1.8)
	nico_tw = create_tween()
	nico_tw.tween_property(nico_text, "visible_ratio", 1.0, clampf(text.length() * 0.022, 0.5, 2.6))
	nico_tw.tween_callback(func(): nico.talking = false)
	await get_tree().create_timer(18.0).timeout
	if gen == bubble_gen:
		bubble.visible = false

func _nico_dismiss() -> void:
	bubble.visible = false

func _nico_alone() -> void:
	_nico_say("Va bene! Io resto qui: se hai bisogno di me, tocca pure.")

func _on_nico_tapped() -> void:
	nico.wave(1.6)
	if view == "district":
		_nico_zone_talk(focus_zone)
	else:
		_nico_suggest()

func _nico_intro() -> void:
	if intro_done:
		return
	intro_done = true
	await get_tree().create_timer(1.2).timeout
	var acts := []
	if _find_target() != null:
		acts.append({"label": "Dove vado oggi?", "call": _nico_suggest})
	acts.append({"label": "Faccio da solo", "call": _nico_alone})
	_nico_say("Ciao! Sono Nico, l'elfo di Babbo Natale. Tocca un quartiere per avvicinarti e scoprire cosa c'è dentro. Se ti perdi, tocca me!", acts)

## Il luogo da consigliare: prima quello disponibile oggi, altrimenti il primo già scoperto.
func _find_target():
	var best = null
	for h in houses:
		var st := str(h.status)
		if st == "available":
			return h
		if st == "discovered" and (best == null or h.id < best.id):
			best = h
	return best

func _nico_suggest() -> void:
	var tg = _find_target()
	if tg == null:
		_nico_say("Per ora hai scoperto tutto quello che c'era da scoprire! Torna domani: il villaggio ha sempre una sorpresa.")
		return
	var msg := "C'è una sorpresa che ti aspetta: %s, nel quartiere %s. Vuoi che ti ci porti?" % [str(tg.data.get("name", "un luogo")), _zone_name(str(tg.zone))]
	_nico_say(msg, [{"label": "Portami lì", "call": _guide_to_target}, {"label": "Più tardi", "call": _nico_dismiss}])

func _guide_to_target() -> void:
	var tg = _find_target()
	if tg == null:
		return
	_set_guided(tg)
	_focus_zone(str(tg.zone), false)
	_nico_say("Eccoci! Cerca la freccia dorata: ti indica %s." % str(tg.data.get("name", "il luogo")),
		[{"label": "Aprilo", "call": _open_guided}, {"label": "Ok", "call": _nico_dismiss}])

func _open_guided() -> void:
	if target != null:
		_open(target.data)

func _set_guided(node) -> void:
	target = node
	for h in houses:
		h.guided = (h == node)

func _nico_zone_talk(slug: String) -> void:
	var st: Dictionary = zone_stats.get(slug, {"total": 0, "done": 0, "open": 0})
	var msg := str(ZONE_BLURB.get(slug, "Che bel quartiere!"))
	var actions := []
	var tg = _find_target()
	if tg != null and str(tg.zone) == slug:
		msg += "\nQui c'è la sorpresa che ti aspetta: %s! Segui la freccia." % str(tg.data.get("name", "un luogo"))
		_set_guided(tg)
		actions.append({"label": "Aprila", "call": _open_guided})
	elif int(st["open"]) > 0:
		msg += "\nTocca un luogo per aprirlo o rivederlo."
	else:
		msg += "\nPer ora qui è tutto chiuso, ma tornerà utile più avanti!"
	_nico_say(msg, actions)

func _zone_name(slug: String) -> String:
	if zones.has(slug):
		return str(zones[slug]["name"])
	return "del villaggio"

# ---------------------------------------------------------------- vista quartiere

func _set_vignette(v: float) -> void:
	vig = v
	vignette_mat.set_shader_parameter("strength", v)

func _tween_cam(pos: Vector2, z: float, v: float) -> void:
	if cam_tw != null and cam_tw.is_valid():
		cam_tw.kill()
	cam_tw = create_tween().set_parallel(true).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN_OUT)
	cam_tw.tween_property(cam, "position", pos, 0.95)
	cam_tw.tween_property(cam, "zoom", Vector2.ONE * z, 0.95)
	cam_tw.tween_method(_set_vignette, vig, v, 0.95)

func _set_focus_dim(slug: String) -> void:
	var tw := create_tween().set_parallel(true)
	var any := false
	for h in houses:
		var keep: bool = slug == "" or str(h.zone) == slug
		tw.tween_property(h, "dim", 1.0 if keep else 0.32, 0.6)
		any = true
	for pr in props:
		if str(pr.zone) != "":
			var keep2: bool = slug == "" or str(pr.zone) == slug
			tw.tween_property(pr, "dim", 1.0 if keep2 else 0.4, 0.6)
			any = true
	for lb in labels.values():
		tw.tween_property(lb, "shown", 1.0 if slug == "" else 0.0, 0.5)
		any = true
	if not any:
		tw.kill()

func _focus_zone(slug: String, talk := true) -> void:
	if slug == "" or not zones.has(slug):
		return
	if view == "district" and focus_zone == slug:
		return
	view = "district"
	focus_zone = slug
	popup.visible = false
	var zg: Vector2 = zones[slug]["g"]
	var vs := get_viewport_rect().size
	var z := clampf(minf(vs.x / 800.0, vs.y / 560.0), 0.85, 1.6)
	_tween_cam(iso(zg) + Vector2(0, -45), z, 0.85)
	_set_focus_dim(slug)
	_update_header()
	_post_view("district")
	if talk:
		_nico_zone_talk(slug)

func _back_to_village() -> void:
	if view == "village":
		return
	view = "village"
	focus_zone = ""
	popup.visible = false
	_tween_cam(Vector2(0, 20), 0.85, 0.0)
	_set_focus_dim("")
	_update_header()
	_post_view("village")
	_nico_say("Eccoci di nuovo nel villaggio! Dove andiamo adesso?", [{"label": "Dove vado oggi?", "call": _nico_suggest}])

func _update_header() -> void:
	if view == "district":
		var st: Dictionary = zone_stats.get(focus_zone, {"total": 0, "done": 0, "open": 0})
		header_title.text = _zone_name(focus_zone)
		header_sub.text = "%d/%d completati" % [int(st["done"]), int(st["total"])]
		back_btn.visible = true
	else:
		var tot := 0
		var dn := 0
		for slug in zone_stats:
			tot += int(zone_stats[slug]["total"])
			dn += int(zone_stats[slug]["done"])
		header_title.text = "Villaggio di Natale"
		header_sub.text = "%d/%d luoghi completati" % [dn, tot]
		back_btn.visible = false

# ---------------------------------------------------------------- dati

func _nearest_zone(g: Vector2) -> String:
	var best := ""
	var bd := 1000000.0
	for slug in zones:
		var zg: Vector2 = zones[slug]["g"]
		var d := g.distance_to(zg)
		if d < bd:
			bd = d
			best = str(slug)
	return best

func _on_village_loaded(data: Dictionary) -> void:
	# Il server manda le frasi dei quiz già filtrate per i giorni sbloccati.
	if data.has("dialogues") and data["dialogues"] is Dictionary:
		dialogues = data["dialogues"]
	_hide_loader()
	for n in houses + props + labels.values() + villagers:
		n.queue_free()
	houses.clear()
	props.clear()
	spots.clear()
	zones.clear()
	labels.clear()
	zone_stats.clear()
	deco_pts.clear()
	villagers.clear()
	paths.clear()
	final_box = null
	final_lit = false
	target = null
	var blocked: Array[Vector2] = []
	for z in data.get("zones", []):
		var zg := Vector2((float(z.get("positionX", 50)) - 50.0) / 50.0, (float(z.get("positionY", 50)) - 50.0) / 50.0) * S
		var slug := str(z.get("slug", ""))
		zones[slug] = {"name": str(z.get("name", "")), "g": zg}
		if BUILDINGS.has(slug):
			var bg := zg + Vector2(-0.9, -0.9)
			_add_prop(BUILDINGS[slug], bg, 1.0, "", slug)
			blocked.append(bg)
	for h in data.get("hotspots", []):
		var g := Vector2((float(h.get("x", 50)) - 50.0) / 50.0, (float(h.get("y", 50)) - 50.0) / 50.0) * S
		spots.append(g)
		var node = HouseScript.new()
		node.position = iso(g)
		world.add_child(node)
		node.setup(h)
		var zs := str(h.get("zoneSlug", ""))
		if zs == "" or not zones.has(zs):
			zs = _nearest_zone(g)
		node.zone = zs
		houses.append(node)
		if h.get("dayNumber") != null and int(h.get("dayNumber")) == 24 and str(h.get("state")) != "locked":
			final_lit = true
		if not zone_stats.has(zs):
			zone_stats[zs] = {"total": 0, "done": 0, "open": 0}
		var zst: Dictionary = zone_stats[zs]
		zst["total"] = int(zst["total"]) + 1
		var stt := str(h.get("state", "locked"))
		if stt == "completed":
			zst["done"] = int(zst["done"]) + 1
		if stt != "locked":
			zst["open"] = int(zst["open"]) + 1
	if zones.has("piazza-centrale"):
		var pg: Vector2 = zones["piazza-centrale"]["g"]
		_add_prop("finalbox", pg, 1.5, "", "piazza-centrale")
		final_box = props[props.size() - 1]
		final_box.lit = final_lit
		blocked.append(pg)
	_build_labels()
	_build_decor(blocked)
	_build_villagers()
	queue_redraw()
	var placed := 0
	var tries := 0
	while placed < 80 and tries < 2500:
		tries += 1
		var p := Vector2(rng.randf_range(-7.0, 7.0), rng.randf_range(-7.0, 7.0))
		if not _free(p, blocked):
			continue
		var snowman := placed % 23 == 5
		_add_prop("snowman" if snowman else "tree", p, 1.0 if snowman else rng.randf_range(0.8, 1.25), "")
		placed += 1
	_update_header()
	_nico_intro()

func _build_labels() -> void:
	for slug in zones:
		var st: Dictionary = zone_stats.get(slug, {"total": 0, "done": 0, "open": 0})
		var avail := false
		for h in houses:
			if str(h.zone) == str(slug) and str(h.status) == "available":
				avail = true
		var lb = LabelScript.new()
		lb.slug = str(slug)
		lb.title = str(zones[slug]["name"])
		lb.done = int(st["done"])
		lb.total = int(st["total"])
		lb.has_available = avail
		var zg: Vector2 = zones[slug]["g"]
		lb.position = iso(zg) + Vector2(0, -195)
		labels_root.add_child(lb)
		labels[slug] = lb

func _deco_ok(p: Vector2, blocked: Array[Vector2]) -> bool:
	for sp in spots:
		if p.distance_to(sp) < 1.0:
			return false
	for b in blocked:
		if p.distance_to(b) < 1.4:
			return false
	for q in deco_pts:
		if p.distance_to(q) < 0.8:
			return false
	if zones.has("lago-ghiacciato"):
		var lg: Vector2 = zones["lago-ghiacciato"]["g"]
		if p.distance_to(lg + Vector2(0, 0.15)) < 2.0:
			return false
	return true

func _add_deco(kind: String, grid: Vector2, s: float) -> void:
	var n = PropScript.new()
	n.kind = kind
	n.position = iso(grid)
	n.scale = Vector2(s, s)
	world.add_child(n)
	props.append(n)
	deco_pts.append(grid)

## Lampioni e bastoncini di zucchero lungo i sentieri, regali e mucchi di neve.
func _build_decor(blocked: Array[Vector2]) -> void:
	if not zones.has("piazza-centrale"):
		return
	var pg: Vector2 = zones["piazza-centrale"]["g"]
	for slug in zones:
		if slug == "piazza-centrale":
			continue
		var zg: Vector2 = zones[slug]["g"]
		var pts := _path_pts(pg, zg, _path_bend(str(slug)))
		paths.append(pts)
		for ki in 2:
			var k := 5 + ki * 6
			var tg := (pts[k + 1] - pts[k - 1]).normalized()
			var p := pts[k] + tg.orthogonal() * (0.55 if ki == 0 else -0.55)
			if _deco_ok(p, blocked):
				_add_deco("lamp", p, 1.0)
		for side in 2:
			var tg2 := (pts[14] - pts[12]).normalized()
			var p2 := pts[13] + tg2.orthogonal() * (0.5 if side == 0 else -0.5)
			if _deco_ok(p2, blocked):
				_add_deco("cane", p2, 1.0)
	for off in [Vector2(-2.1, -0.9), Vector2(2.2, -0.6)]:
		if _deco_ok(pg + off, blocked):
			_add_deco("gifts", pg + off, 1.0)
	var tries := 0
	var placed := 0
	while placed < 14 and tries < 200:
		tries += 1
		var m := Vector2(rng2.randf_range(-7.0, 7.0), rng2.randf_range(-7.0, 7.0))
		if m.length() > 7.0 or not _free(m, blocked) or not _deco_ok(m, blocked):
			continue
		_add_deco("mound", m, rng2.randf_range(0.8, 1.3))
		placed += 1

## Abitanti che passeggiano avanti e indietro lungo i sentieri.
func _build_villagers() -> void:
	var looks: Array = NpcData.VILLAGERS
	var n := 0
	for pi in paths.size():
		var pts: PackedVector2Array = paths[pi]
		for k in 2:
			var v = VillagerScript.new()
			v.m = self
			v.look = looks[(n * 3 + 1) % looks.size()]
			v.route = pts
			v.offset = 0.28 if k == 0 else -0.28
			v.t_route = rng2.randf()
			v.dir = 1.0 if rng2.randf() < 0.5 else -1.0
			v.speed = rng2.randf_range(0.035, 0.06)
			world.add_child(v)
			villagers.append(v)
			n += 1

func _free(p: Vector2, blocked: Array[Vector2]) -> bool:
	for sp in spots:
		if p.distance_to(sp) < 1.3:
			return false
	for b in blocked:
		if p.distance_to(b) < 2.0:
			return false
	for q in deco_pts:
		if p.distance_to(q) < 0.9:
			return false
	for slug in zones:
		var zg: Vector2 = zones[slug]["g"]
		if slug == "piazza-centrale" and p.distance_to(zg) < 3.1:
			return false
		if slug == "lago-ghiacciato" and p.distance_to(zg + Vector2(0, 0.15)) < 2.1:
			return false
	return true

func _add_prop(kind: String, grid: Vector2, s: float, label: String, zone := "") -> void:
	var n = PropScript.new()
	n.kind = kind
	n.label = label
	n.zone = zone
	n.tint = Color("2f6b45") if rng.randf() < 0.6 else Color("26594a")
	n.position = iso(grid)
	n.scale = Vector2(s, s)
	world.add_child(n)
	props.append(n)

# ---------------------------------------------------------------- input

## Quartiere che si trova sotto a un punto del mondo ("" se nessuno).
func _zone_under(p: Vector2) -> String:
	for lb in labels.values():
		if lb.contains(p):
			return str(lb.slug)
	for i in range(houses.size() - 1, -1, -1):
		if houses[i].contains(p):
			return str(houses[i].zone)
	for pr in props:
		if str(pr.zone) != "" and pr.contains(p):
			return str(pr.zone)
	var g := _to_grid(p)
	var best := ""
	var bd := ZONE_R
	for slug in zones:
		var zg: Vector2 = zones[slug]["g"]
		var d := g.distance_to(zg)
		if d < bd:
			bd = d
			best = str(slug)
	return best

func _process(_d: float) -> void:
	ui_check_t += _d
	if ui_check_t >= 0.5:
		ui_check_t = 0.0
		_apply_ui_scale()
	_process_loader(_d)
	var mp := get_global_mouse_position()
	var found := false
	for i in range(houses.size() - 1, -1, -1):
		var on: bool = not found and houses[i].contains(mp)
		houses[i].hover = on
		found = found or on
	var hz := _zone_under(mp)
	if hz == focus_zone:
		hz = ""
	hover_zone = hz
	Input.set_default_cursor_shape(Input.CURSOR_POINTING_HAND if (found or hz != "") else Input.CURSOR_ARROW)

func _unhandled_input(e: InputEvent) -> void:
	if e is InputEventMouseButton:
		if e.button_index == MOUSE_BUTTON_LEFT:
			if e.pressed:
				dragging = true
				drag_dist = 0.0
			else:
				dragging = false
				if drag_dist < 10.0:
					_click(get_global_mouse_position())
		elif e.button_index == MOUSE_BUTTON_WHEEL_UP and e.pressed:
			_zoom(1.1)
		elif e.button_index == MOUSE_BUTTON_WHEEL_DOWN and e.pressed:
			_zoom(1.0 / 1.1)
	elif e is InputEventMouseMotion and dragging:
		if view == "village":
			cam.position -= e.relative / cam.zoom.x
			cam.position = cam.position.clamp(Vector2(-1250, -700), Vector2(1250, 700))
		drag_dist += e.relative.length()
	elif e is InputEventMagnifyGesture:
		_zoom(e.factor)
	elif e is InputEventKey and e.pressed and e.keycode == KEY_ESCAPE and view == "district":
		_back_to_village()

func _zoom(f: float) -> void:
	if view != "village":
		return
	cam.zoom = (cam.zoom * f).clamp(Vector2(0.4, 0.4), Vector2(2.5, 2.5))

func _click(p: Vector2) -> void:
	popup.visible = false
	if final_box != null and final_box.contains(p):
		if view == "district" and focus_zone == "piazza-centrale":
			if final_lit:
				_enter_place({"kind": "finalbox", "name": "La scatola finale", "dayNumber": 24, "state": "available", "zoneSlug": "piazza-centrale", "hint": "Il villaggio ha un ultimo regalo per te."})
			else:
				_show("Una scatola misteriosa", "Si aprirà solo alla fine dell'avventura. Pazienza!", 0)
		else:
			_focus_zone("piazza-centrale")
		return
	for lb in labels.values():
		if lb.contains(p):
			_focus_zone(str(lb.slug))
			return
	for i in range(houses.size() - 1, -1, -1):
		if houses[i].contains(p):
			var hz := str(houses[i].zone)
			if hz == "" or (view == "district" and hz == focus_zone):
				_open(houses[i].data)
			else:
				_focus_zone(hz)
			return
	var z := _zone_under(p)
	if z != "":
		_focus_zone(z)

func _open(d: Dictionary) -> void:
	var dn = d.get("dayNumber")
	if str(d.get("state", "locked")) == "locked":
		_nico_say("%s: %s" % [str(d.get("name", "Luogo")), str(d.get("lockedHint", "Non è ancora il momento…"))])
	else:
		_enter_place(d)

## Entra in un luogo: sfondo + Nico che parla con il personaggio del posto.
func _enter_place(d: Dictionary) -> void:
	popup.visible = false
	bubble.visible = false
	var zs := str(d.get("zoneSlug", ""))
	if zs == "":
		zs = focus_zone
	place.open(d, zs, dialogues)

func _on_place_finished(day: int) -> void:
	open_day = day
	_on_open_pressed()

func _on_place_closed() -> void:
	_nico_say("Che bella chiacchierata! Dove andiamo adesso?", [{"label": "Dove vado oggi?", "call": _nico_suggest}])

func _show(title: String, body: String, day: int) -> void:
	open_day = day
	popup_title.text = title
	popup_body.text = body
	popup_btn.visible = day > 0
	popup.visible = true
	popup.reset_size()
	popup.set_anchors_and_offsets_preset.call_deferred(Control.PRESET_CENTER)

func _on_open_pressed() -> void:
	popup.visible = false
	_set_guided(null)
	if OS.has_feature("web"):
		JavaScriptBridge.eval("window.parent.postMessage({type:'wonderland:open-day',day:%d}, window.location.origin)" % open_day)
	else:
		print("open-day ", open_day)
