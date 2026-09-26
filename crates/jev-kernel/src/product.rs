//! Cartesian product of colored interfaces.
//!
//! Product is juxtaposition: concatenate ports, identify nothing.
//! Dual to glue (pushout identifies a color) and share (pullback names the overlap).
//! Never returns ColorMismatch.

/// Discrete cartesian product: left ports then right ports.
pub fn product_ports(left: &[u8], right: &[u8]) -> Vec<u8> {
    let mut out = Vec::with_capacity(left.len() + right.len());
    out.extend_from_slice(left);
    out.extend_from_slice(right);
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::cospan::pushout_ports;
    use crate::span::pullback_ports;

    #[test]
    fn juxtapose_never_mismatches() {
        let out = product_ports(&[0, 3], &[0, 1]);
        assert_eq!(out, vec![0, 3, 0, 1]);
    }

    #[test]
    fn empty_factors() {
        assert_eq!(product_ports(&[], &[1]), vec![1]);
        assert_eq!(product_ports(&[2], &[]), vec![2]);
        assert_eq!(product_ports(&[], &[]), Vec::<u8>::new());
    }

    #[test]
    fn product_is_not_pushout_or_pullback() {
        let left = [0u8, 3];
        let right = [0u8, 1];
        let prod = product_ports(&left, &right);
        let glue = pushout_ports(&left, &right, 0).unwrap();
        let share = pullback_ports(&left, &right, 0).unwrap();
        assert_ne!(prod, glue);
        assert_ne!(prod, share);
        assert_eq!(prod.len(), left.len() + right.len());
    }
}
