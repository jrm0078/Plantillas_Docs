<?php
header('Content-Type: application/json');
require_once 'config.php';

$action = $_GET['action'] ?? '';

// Obtener lista de plantillas disponibles
if ($action === 'listar') {
    try {
        $stmt = $pdo->query("
            SELECT cod_plantilla, nombre, descripcion, tipo_documento 
            FROM plantillas 
            ORDER BY nombre
        ");
        $plantillas = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $plantillas]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

// Obtener plantilla específica con variables
else if ($action === 'obtener') {
    $cod = $_GET['cod'] ?? '';
    
    if (!$cod) {
        echo json_encode(['success' => false, 'error' => 'Código de plantilla requerido']);
        exit;
    }
    
    try {
        // Obtener plantilla
        $stmt = $pdo->prepare("
            SELECT cod_plantilla, nombre, descripcion, contenido 
            FROM plantillas 
            WHERE cod_plantilla = :cod
        ");
        $stmt->execute([':cod' => $cod]);
        $plantilla = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$plantilla) {
            echo json_encode(['success' => false, 'error' => 'Plantilla no encontrada']);
            exit;
        }
        
        // Obtener variables
        $stmt = $pdo->prepare("
            SELECT nombre_variable, etiqueta, tipo, requerido 
            FROM plantilla_variables 
            WHERE cod_plantilla = :cod
            ORDER BY orden
        ");
        $stmt->execute([':cod' => $cod]);
        $variables = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $plantilla['variables'] = $variables;
        
        echo json_encode(['success' => true, 'data' => $plantilla]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

// Reemplazar variables en plantilla
else if ($action === 'reemplazar') {
    $cod = $_GET['cod'] ?? '';
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$cod) {
        echo json_encode(['success' => false, 'error' => 'Código de plantilla requerido']);
        exit;
    }
    
    try {
        // Obtener plantilla
        $stmt = $pdo->prepare("SELECT contenido FROM plantillas WHERE cod_plantilla = :cod");
        $stmt->execute([':cod' => $cod]);
        $plantilla = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$plantilla) {
            echo json_encode(['success' => false, 'error' => 'Plantilla no encontrada']);
            exit;
        }
        
        // Reemplazar variables (-variable-)  con valores
        $contenido = $plantilla['contenido'];
        
        if ($data && is_array($data)) {
            foreach ($data as $variable => $valor) {
                // Reemplazar -variable- con el valor
                $contenido = str_replace('-' . $variable . '-', $valor, $contenido);
            }
        }
        
        echo json_encode(['success' => true, 'data' => ['contenido' => $contenido]]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

// Guardar documento generado
else if ($action === 'guardar_documento') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    try {
        $stmt = $pdo->prepare("
            INSERT INTO documentos_generados 
            (cod_plantilla, id_cliente, contenido_final, datos_json)
            VALUES (:cod, :cliente, :contenido, :datos)
            ON DUPLICATE KEY UPDATE 
            contenido_final = :contenido, 
            datos_json = :datos,
            fecha_actualizacion = NOW()
        ");
        
        $stmt->execute([
            ':cod' => $data['cod_plantilla'] ?? null,
            ':cliente' => $data['id_cliente'] ?? null,
            ':contenido' => $data['contenido_final'] ?? '',
            ':datos' => json_encode($data['datos'] ?? [])
        ]);
        
        echo json_encode(['success' => true, 'message' => 'Documento guardado correctamente']);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

// Obtener clientes (para selector)

else if ($action === 'clientes') {
    try {
        $stmt = $pdo->query("
            SELECT id, nombre, nif, email 
            FROM clientes 
            ORDER BY nombre
        ");
        $clientes = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $clientes]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

// Obtener datos de cliente
else if ($action === 'cliente_datos') {
    $id = $_GET['id'] ?? '';
    
    if (!$id) {
        echo json_encode(['success' => false, 'error' => 'ID de cliente requerido']);
        exit;
    }
    
    try {
        $stmt = $pdo->prepare("SELECT * FROM clientes WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $cliente = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$cliente) {
            echo json_encode(['success' => false, 'error' => 'Cliente no encontrado']);
            exit;
        }
        
        echo json_encode(['success' => true, 'data' => $cliente]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

else {
    echo json_encode(['success' => false, 'error' => 'Acción no válida']);
}
?>
