//! Colored operad kernel for JEV.
//! Composition γ is defined only when the child output color matches the parent port.

use std::collections::{HashMap, HashSet};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum Color {
    Entity,
    Concept,
    Idea,
    Evidence,
    Action,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Doctrine {
    PortPlugging,
    VariableSharing,
    Moore,
}

#[derive(Clone, Debug)]
pub struct Operation {
    pub id: String,
    pub name: String,
    pub output: Color,
    pub inputs: Vec<Color>,
    pub doctrine: Doctrine,
}

#[derive(Clone, Debug)]
pub struct TreeNode {
    pub id: String,
    pub op: String,
    pub children: Vec<Option<String>>,
}

#[derive(Clone, Debug)]
pub struct Forest {
    pub operations: HashMap<String, Operation>,
    pub nodes: HashMap<String, TreeNode>,
    pub root: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum ComposeError {
    UnknownNode,
    MissingOp,
    Arity,
    ColorMismatch { expected: Color, actual: Color },
    Cycle,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Verdict {
    Green,
    Amber,
    Red,
}

#[derive(Clone, Copy, Debug)]
pub struct Thresholds {
    pub green: f64,
    pub toxin: f64,
    pub red: f64,
}

impl Default for Thresholds {
    fn default() -> Self {
        Self {
            green: 0.72,
            toxin: 0.12,
            red: 0.4,
        }
    }
}

pub fn check_port(
    forest: &Forest,
    parent_id: &str,
    port: usize,
    child_id: &str,
) -> Result<(), ComposeError> {
    let parent = forest.nodes.get(parent_id).ok_or(ComposeError::UnknownNode)?;
    let child = forest.nodes.get(child_id).ok_or(ComposeError::UnknownNode)?;
    let pop = forest.operations.get(&parent.op).ok_or(ComposeError::MissingOp)?;
    let cop = forest.operations.get(&child.op).ok_or(ComposeError::MissingOp)?;
    if port >= pop.inputs.len() {
        return Err(ComposeError::Arity);
    }
    let expected = pop.inputs[port];
    if expected != cop.output {
        return Err(ComposeError::ColorMismatch {
            expected,
            actual: cop.output,
        });
    }
    Ok(())
}

fn would_cycle(forest: &Forest, parent_id: &str, child_id: &str) -> bool {
    let mut seen = HashSet::new();
    let mut stack = vec![child_id.to_string()];
    while let Some(id) = stack.pop() {
        if id == parent_id {
            return true;
        }
        if !seen.insert(id.clone()) {
            continue;
        }
        if let Some(node) = forest.nodes.get(&id) {
            for c in node.children.iter().flatten() {
                stack.push(c.clone());
            }
        }
    }
    false
}

/// γ — plug `child_id` into `parent_id` at `port`.
pub fn compose(
    forest: &Forest,
    parent_id: &str,
    port: usize,
    child_id: &str,
) -> Result<Forest, ComposeError> {
    if would_cycle(forest, parent_id, child_id) {
        return Err(ComposeError::Cycle);
    }
    check_port(forest, parent_id, port, child_id)?;
    let mut next = forest.clone();
    let parent = next
        .nodes
        .get_mut(parent_id)
        .ok_or(ComposeError::UnknownNode)?;
    parent.children[port] = Some(child_id.to_string());
    Ok(next)
}

pub fn score_fill(
    dist: [f64; 5],
    allowed: &[Color],
    forbidden: &[Color],
    tau: Thresholds,
) -> Verdict {
    let z: f64 = dist.iter().map(|p| p.max(0.0)).sum();
    let p = if z <= 0.0 {
        [0.0; 5]
    } else {
        let mut out = [0.0; 5];
        for i in 0..5 {
            out[i] = dist[i].max(0.0) / z;
        }
        out
    };
    let colors = [
        Color::Entity,
        Color::Concept,
        Color::Idea,
        Color::Evidence,
        Color::Action,
    ];
    let mut allowed_mass = 0.0;
    let mut toxin_mass = 0.0;
    for (i, c) in colors.iter().enumerate() {
        if allowed.contains(c) {
            allowed_mass += p[i];
        }
        if forbidden.contains(c) {
            toxin_mass += p[i];
        }
    }
    if toxin_mass > tau.toxin || allowed_mass < tau.red {
        Verdict::Red
    } else if allowed_mass >= tau.green {
        Verdict::Green
    } else {
        Verdict::Amber
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn toxin_is_red() {
        let v = score_fill(
            [0.1, 0.1, 0.1, 0.1, 0.6],
            &[Color::Evidence],
            &[Color::Action],
            Thresholds::default(),
        );
        assert_eq!(v, Verdict::Red);
    }
}
