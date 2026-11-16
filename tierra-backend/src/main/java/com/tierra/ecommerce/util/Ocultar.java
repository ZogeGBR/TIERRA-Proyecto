package com.tierra.ecommerce.util;

// Lo que se le muestra al dueño de un email sobre un pedido (ADR 0005, "Qué
// ve el dueño de un email"): un email mal escrito asocia el pedido a otra
// persona, así que el DNI y el teléfono del destinatario van ocultos. Se
// ocultan en el backend, al armar la respuesta: el dato completo nunca llega
// al navegador.
public final class Ocultar {

    private Ocultar() {}

    // "30111222" -> "***.***.222". Con menos de 3 números no se muestra ninguno.
    public static String dni(String dni) {
        if (dni == null) return null;
        String numeros = dni.replaceAll("\\D", "");
        return "***.***." + (numeros.length() >= 3 ? numeros.substring(numeros.length() - 3) : "***");
    }

    // "+54 9 2945 123456" -> "••• 3456". Con menos de 4 números no se muestra ninguno.
    public static String telefono(String telefono) {
        if (telefono == null) return null;
        String numeros = telefono.replaceAll("\\D", "");
        return "••• " + (numeros.length() >= 4 ? numeros.substring(numeros.length() - 4) : "••••");
    }
}
