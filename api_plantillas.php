<?php
header('Content-Type: application/json');
require_once 'config.php';

$action = $_GET['action'] ?? '';

// Obtener plantillas
if ($action === 'listar') {
    try {
        $stmt = $pdo->query("SELECT cod_plantilla, contenido FROM plantillas ORDER BY cod_plantilla");
        $plantillas = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $plantillas]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

// Obtener plantilla específica
else if ($action === 'obtener') {
    $cod = $_GET['cod'] ?? '';
    
    if (!$cod) {
        echo json_encode(['success' => false, 'error' => 'Código de plantilla requerido']);
        exit;
    }
    
    try {
        $stmt = $pdo->prepare("SELECT contenido FROM plantillas WHERE cod_plantilla = :cod");
        $stmt->execute([':cod' => $cod]);
        $plantilla = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$plantilla) {
            echo json_encode(['success' => false, 'error' => 'Plantilla no encontrada']);
            exit;
        }
        
        echo json_encode(['success' => true, 'data' => $plantilla]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

else {
    echo json_encode(['success' => false, 'error' => 'Acción no válida']);
}
?>
