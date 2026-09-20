//! C ABI for the browser. No wasm-bindgen — static buffers, integer colors.

use crate::cospan::pushout_ports;
use crate::score_fill;
use crate::span::pullback_ports;
use crate::Color;
use crate::Thresholds;
use crate::Verdict;
use std::cell::UnsafeCell;

const MAX: usize = 16;

struct Buffers {
    input: UnsafeCell<[u8; 64]>,
    output: UnsafeCell<[u8; MAX]>,
    out_len: UnsafeCell<u32>,
}

unsafe impl Sync for Buffers {}

static BUFS: Buffers = Buffers {
    input: UnsafeCell::new([0; 64]),
    output: UnsafeCell::new([0; MAX]),
    out_len: UnsafeCell::new(0),
};

#[no_mangle]
pub extern "C" fn jev_in_ptr() -> *mut u8 {
    unsafe { (*BUFS.input.get()).as_mut_ptr() }
}

#[no_mangle]
pub extern "C" fn jev_out_ptr() -> *const u8 {
    unsafe { (*BUFS.output.get()).as_ptr() }
}

#[no_mangle]
pub extern "C" fn jev_out_len() -> u32 {
    unsafe { *BUFS.out_len.get() }
}

unsafe fn write_out(ports: &[u8]) {
    let n = ports.len().min(MAX);
    let out = &mut *BUFS.output.get();
    out[..n].copy_from_slice(&ports[..n]);
    *BUFS.out_len.get() = n as u32;
}

/// Layout in IN: [left...][right...]. Returns 0 on glue, 1 on mismatch.
#[no_mangle]
pub unsafe extern "C" fn jev_pushout(left_len: u32, right_len: u32, color: u8) -> i32 {
    let base = *BUFS.input.get();
    let left = &base[..left_len as usize];
    let right = &base[left_len as usize..left_len as usize + right_len as usize];
    match pushout_ports(left, right, color) {
        Ok(ports) => {
            write_out(&ports);
            0
        }
        Err(_) => 1,
    }
}

#[no_mangle]
pub unsafe extern "C" fn jev_pullback(left_len: u32, right_len: u32, color: u8) -> i32 {
    let base = *BUFS.input.get();
    let left = &base[..left_len as usize];
    let right = &base[left_len as usize..left_len as usize + right_len as usize];
    match pullback_ports(left, right, color) {
        Ok(ports) => {
            write_out(&ports);
            0
        }
        Err(_) => 1,
    }
}

fn color_bit(bit: u32, i: u32) -> bool {
    (bit & (1 << i)) != 0
}

fn color_at(i: usize) -> Color {
    match i {
        0 => Color::Entity,
        1 => Color::Concept,
        2 => Color::Idea,
        3 => Color::Evidence,
        _ => Color::Action,
    }
}

/// allowed/forbidden are 5-bit masks (bit 0 = entity … bit 4 = action).
/// Returns 0 GREEN, 1 AMBER, 2 RED.
#[no_mangle]
pub extern "C" fn jev_score(
    e: f64,
    c: f64,
    i: f64,
    v: f64,
    a: f64,
    allowed: u32,
    forbidden: u32,
    green: f64,
    toxin: f64,
    red: f64,
) -> i32 {
    let mut allow = Vec::new();
    let mut forbid = Vec::new();
    for idx in 0..5u32 {
        if color_bit(allowed, idx) {
            allow.push(color_at(idx as usize));
        }
        if color_bit(forbidden, idx) {
            forbid.push(color_at(idx as usize));
        }
    }
    let tau = Thresholds {
        green,
        toxin,
        red,
    };
    match score_fill([e, c, i, v, a], &allow, &forbid, tau) {
        Verdict::Green => 0,
        Verdict::Amber => 1,
        Verdict::Red => 2,
    }
}
