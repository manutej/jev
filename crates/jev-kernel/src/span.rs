//! Spans of colored interfaces.
//!
//! A span is A ← S → B. The nadir S is the shared variable.
//! Composition of variable-sharing systems is the pullback:
//! two views of the same color collapse to one state.

use crate::cospan::GlueError;

/// Discrete pullback: the shared color, if both feet carry it.
pub fn pullback_ports(left: &[u8], right: &[u8], color: u8) -> Result<Vec<u8>, GlueError> {
    if left.contains(&color) && right.contains(&color) {
        Ok(vec![color])
    } else {
        Err(GlueError::ColorMismatch)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn share_entity() {
        assert_eq!(pullback_ports(&[0, 3], &[0, 1], 0).unwrap(), vec![0]);
    }
}
