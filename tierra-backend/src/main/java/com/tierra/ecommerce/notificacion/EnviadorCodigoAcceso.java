package com.tierra.ecommerce.notificacion;

// Cómo le llega el código al cliente. Hoy hay una sola implementación, la de
// desarrollo (EnviadorCodigoAccesoDesarrollo). La real, por email, llega con
// el módulo de notificaciones de la Fase 3.
//
// Fuera del perfil dev y sin una implementación real, el backend no arranca
// (ver EnvioCodigoAccesoListener): un sistema que parece funcionar y no manda
// nada es peor que un error claro en el deploy.
//
// El mensaje que se envíe tiene que decir el código, que vence en diez
// minutos y que si la persona no lo pidió puede ignorarlo. NO puede llevar un
// enlace que abra sesión: el código se tipea (ADR 0005).
public interface EnviadorCodigoAcceso {

    void enviar(String email, String nombre, String codigo);
}
