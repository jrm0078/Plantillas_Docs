<?php
header('Content-Type: application/json');
require_once 'config.php';

$action = $_GET['action'] ?? '';

// Obtener lista de presupuestos
if ($action === 'listar') {
    try {
        $stmt = $pdo->query("SELECT id, num_presupuesto, cliente, fecha FROM presupuestos ORDER BY fecha DESC LIMIT 50");
        $presupuestos = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $presupuestos]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

// Obtener detalles de un presupuesto
else if ($action === 'obtener') {
    $id = $_GET['id'] ?? '';
    
    if (!$id) {
        echo json_encode(['success' => false, 'error' => 'ID requerido']);
        exit;
    }
    
    try {
        $stmt = $pdo->prepare("SELECT * FROM presupuestos WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $presupuesto = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$presupuesto) {
            echo json_encode(['success' => false, 'error' => 'Presupuesto no encontrado']);
            exit;
        }
        
        echo json_encode(['success' => true, 'data' => $presupuesto]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

// Guardar/Actualizar presupuesto
else if ($action === 'guardar') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    try {
        if (isset($data['id']) && $data['id']) {
            // Actualizar
            $stmt = $pdo->prepare("
                UPDATE presupuestos 
                SET cliente = :cliente, 
                    num_presupuesto = :num_presupuesto,
                    fecha = :fecha,
                    validez = :validez,
                    descripcion = :descripcion,
                    cantidad = :cantidad,
                    precio_unitario = :precio_unitario,
                    descuento = :descuento
                WHERE id = :id
            ");
            
            $stmt->execute([
                ':id' => $data['id'],
                ':cliente' => $data['cliente'],
                ':num_presupuesto' => $data['num_presupuesto'],
                ':fecha' => $data['fecha'],
                ':validez' => $data['validez'],
                ':descripcion' => $data['descripcion'],
                ':cantidad' => $data['cantidad'],
                ':precio_unitario' => $data['precio_unitario'],
                ':descuento' => $data['descuento']
            ]);
            
            echo json_encode(['success' => true, 'message' => 'Presupuesto actualizado', 'id' => $data['id']]);
        } else {
            // Insertar nuevo
            $stmt = $pdo->prepare("
                INSERT INTO presupuestos 
                (cliente, num_presupuesto, fecha, validez, descripcion, cantidad, precio_unitario, descuento)
                VALUES (:cliente, :num_presupuesto, :fecha, :validez, :descripcion, :cantidad, :precio_unitario, :descuento)
            ");
            
            $stmt->execute([
                ':cliente' => $data['cliente'],
                ':num_presupuesto' => $data['num_presupuesto'],
                ':fecha' => $data['fecha'],
                ':validez' => $data['validez'],
                ':descripcion' => $data['descripcion'],
                ':cantidad' => $data['cantidad'],
                ':precio_unitario' => $data['precio_unitario'],
                ':descuento' => $data['descuento']
            ]);
            
            $id = $pdo->lastInsertId();
            echo json_encode(['success' => true, 'message' => 'Presupuesto creado', 'id' => $id]);
        }
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

else {
    echo json_encode(['success' => false, 'error' => 'Acción no válida']);
}
?>
