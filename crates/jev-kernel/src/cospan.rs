//! Cospans of colored interfaces.
//!
//! A cospan is A → I ← B. The apex I is the glue (shared ports).
//! Composition of port-plugging systems is the pushout of that cospan:
//! identify the matching color and emit the leftover outer ports.

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum GlueError {
    ColorMismatch,
}

/// Discrete pushout: drop the first matching `color` on each foot, concatenate the rest.
pub fn pushout_ports(left: &[u8], right: &[u8], color: u8) -> Result<Vec<u8>, GlueError> {
    let li = left.iter().position(|&p| p == color).ok_or(GlueError::ColorMismatch)?;
    let ri = right.iter().position(|&p| p == color).ok_or(GlueError::ColorMismatch)?;
    let mut out = Vec::with_capacity(left.len() + right.len() - 2);
    out.extend(left.iter().enumerate().filter(|(i, _)| *i != li).map(|(_, p)| *p));
    out.extend(right.iter().enumerate().filter(|(i, _)| *i != ri).map(|(_, p)| *p));
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn glue_entity() {
        // left: entity, evidence   right: entity, concept
        let out = pushout_ports(&[0, 3], &[0, 1], 0).unwrap();
        assert_eq!(out, vec![3, 1]);
    }

    #[test]
    fn mismatch_is_err() {
        assert_eq!(pushout_ports(&[0, 3], &[1, 4], 4), Err(GlueError::ColorMismatch));
    }
}
